class TwinpxZonesDeliveryClass {
  constructor(zdObj) {
    //variables
    this.fetchTimeout = 20000;
    this.zones = zdObj.zones || {};
    this.ymapsUrl = zdObj.ymapsUrl;
    this.addressProperty = zdObj.addressProperty;
    this.addressInput = zdObj.addressInput;
    this.centerMaps = zdObj.centerMaps;
    this.chosenZoneTitle = zdObj.chosenZoneTitle;
    this.chosenZoneId = zdObj.chosenZoneId;

    // this.chosenZoneId;
    // this.chosenZoneTitle;
    this.zoneOpacity = 0.1;
    this.ymapsMap;
    this.deliveryPoint;
    this.chosenAddressWithCity;

    //elems
    this.modal = document.getElementById('TwpxZdModal');
    this.modalBody = this.modal.querySelector('.twpx-zd-modal-body');
    this.modalClose = this.modal.querySelector('.twpx-zd-modal-close');
    this.btnDefault = this.modal.querySelector('.twpx-zd-modal-btn--default');
    this.btnClose = this.modal.querySelector('.twpx-zd-modal-btn--close');
    this.ymap = this.modal.querySelector('#TwpxZdYmap');
    this.modalContent = this.modal.querySelector('.twpx-zd-modal-content');
    this.modalError = this.modal.querySelector('.twpx-zd-modal-error');
    this.addressControl;

    this.init();
    this.addEvents();
  }

  init() {
    this.initAddressControl();
    this.ymapsReady();
    this.onBeforeSendRequest();
    this.showZoneTitle();
  }

  addEvents() {
    this.modalBody.addEventListener('click', (e) => {
      e.stopPropagation();
    });

    this.modal.addEventListener('click', (e) => {
      e.preventDefault();
      this.hideModal();
    });

    this.modalClose.addEventListener('click', (e) => {
      e.preventDefault();
      this.hideModal();
    });

    this.btnClose.addEventListener('click', (e) => {
      e.preventDefault();
      this.hideModal();
    });

    this.btnDefault.addEventListener('click', (e) => {
      e.preventDefault();
      this.sendZoneId();
    });
  }

  //methods
  showModal() {
    //remove page scroll
    document.querySelector('body').classList.add('twpx-zd-no-scroll');
    this.getCenterMapsFromCookies();
    //show errors if needed
    if (!this.ymapsUrl) {
      this.showError(BX.message('TWINPX_JS_NO_YMAP_KEY'));
      this.modal.classList.add('twpx-zd-modal--show');
      this.modal.classList.add('twpx-zd-modal--z');
      return;
    } else if (!this.centerMaps) {
      this.showError(BX.message('TWINPX_JS_NO_REGION'));
      this.modal.classList.add('twpx-zd-modal--show');
      this.modal.classList.add('twpx-zd-modal--z');
      return;
    } else if (this.ymapsMap) {
      //geo code
      const zdGeocoder = ymaps.geocode(this.centerMaps, {
        results: 1,
      });

      zdGeocoder.then(async (res) => {
        let firstGeoObject = res.geoObjects.get(0);

        this.highlightResult(firstGeoObject);

        //let firstGeoObjectCoords = firstGeoObject.geometry.getCoordinates();
        this.regionBounds = firstGeoObject.properties.get('boundedBy');
        //this.chosenCoords = firstGeoObjectCoords;
        this.ymapsMap.setBounds(this.regionBounds);

        this.modal.classList.add('twpx-zd-modal--show');
        this.modal.classList.add('twpx-zd-modal--z');
      });
    }
  }

  getCenterMapsFromCookies() {
    this.centerMaps =
      decodeURI(
        document.cookie.replace(
          /(?:(?:^|.*;\s*)ZONE_LOCATION\s*\=\s*([^;]*).*$)|^.*$/,
          '$1'
        )
      ) || this.centerMaps;
  }

  getChosenZoneFromCookies() {
    //id
    this.chosenZoneId =
      decodeURI(
        document.cookie.replace(
          /(?:(?:^|.*;\s*)ZONE_ID\s*\=\s*([^;]*).*$)|^.*$/,
          '$1'
        )
      ) || 0;
    //title
    this.chosenZoneTitle = this.zones[this.chosenZoneId] || '';
  }

  showError(message) {
    this.modalContent.classList.add('twpx-zd-modal-content--error');
    this.modalError.innerHTML = `${message}`;
  }

  hideError() {
    this.modalContent.classList.remove('twpx-zd-modal-content--error');
    this.modalError.innerHtml = ``;
  }

  hideModal() {
    //remove page scroll
    document.querySelector('body').classList.remove('twpx-zd-no-scroll');

    this.modal.classList.remove('twpx-zd-modal--show');

    setTimeout(() => {
      this.modal.classList.remove('twpx-zd-modal--z');
    }, 500);
  }

  findAddressControl() {
    if (this.addressProperty && this.addressProperty.forEach) {
      this.addressControl = undefined;
      this.addressProperty.forEach((name) => {
        this.addressControl =
          document.querySelector(`[name=${name}]`) || this.addressControl;
      });
    }

    return this.addressControl;
  }

  initAddressControl() {
    this.addressControl = this.findAddressControl();

    if (!this.addressControl || !this.addressInput) {
      return;
    }
    this.addressControl.addEventListener('blur', () => {
      //check if zones delivery is checked
      this.findCheckbox();
      if (!this.checkbox || !this.checkbox.checked) {
        return;
      }

      //get zone id
      this.chosenAddress = this.addressControl.value;

      this.getCenterMapsFromCookies();

      let addressGeocoder = ymaps.geocode(
        this.centerMaps + ', ' + this.chosenAddress,
        {
          results: 1,
        }
      );

      addressGeocoder
        .then(async (res) => {
          let geoObject = res.geoObjects.get(0);

          if (!geoObject) {
            this.chosenZoneId = 0;
            this.chosenZoneTitle = '';
            this.sendZoneId(true);
            this.ymapsReset();
            return;
          }

          let coords = geoObject.geometry.getCoordinates();
          this.chosenCoords = coords;

          let promise = new Promise(async (res, rej) => {
            if (!this.polygons) {
              if (window.BX) {
                BX.ajax
                  .runComponentAction(
                    'twinpx:zones.delivery',
                    'getDeliveryZone',
                    {
                      mode: 'class',
                      method: 'post', //По умолчанию, POST.
                      data: { id: id }, //ID зоны доставки
                    }
                  )
                  .then(
                    (response) => {
                      this.polygons = response;
                      if (this.polygons) {
                        res(this.polygons);
                      }
                    },
                    (error) => {
                      rej(error);
                    }
                  );
              }
            }
          });

          promise.then(
            () => {
              this.deliveryZones =
                this.deliveryZones || ymaps.geoQuery(this.polygons);

              let polygon = this.deliveryZones.searchContaining(coords).get(0);

              if (polygon) {
                let newId = polygon.properties.get('id');
                if (this.chosenZoneId !== newId) {
                  this.chosenZoneId = newId;
                  this.chosenZoneTitle = polygon.properties.get('title');
                  this.sendZoneId(true);
                }
              } else {
                this.chosenZoneId = 0;
                this.chosenZoneTitle = '';
                this.sendZoneId(true);
              }

              //set placemark on the map
              this.deliveryPoint.geometry.setCoordinates(coords);
              this.ymapsMap.setZoom(12);

              this.highlightResult(this.deliveryPoint);
            },
            (error) => {
              this.showError(error);
            }
          );
        })
        .catch((error) => {
          console.log(error); // вывести ошибку
        });
    });
  }

  async sendZoneId(blurAddressControlFlag) {
    const formData = new FormData();
    formData.append('zid', this.chosenZoneId);
    formData.append('coords', this.chosenCoords);
    let response = await fetch(
      `/bitrix/services/main/ajax.php?mode=class&c=twinpx:zones.delivery&action=setZone`,
      {
        method: 'POST',
        body: formData,
      }
    );

    let result = await response.json();

    if (typeof result === 'object' && result.status === 'success') {
      this.initAddressControl();
      if (this.addressControl && !blurAddressControlFlag) {
        this.addressControl.value = this.chosenAddressWithCity;
      }
      this.hideModal();
      window.BX.Sale.OrderAjaxComponent.sendRequest();
    } else if (typeof result === 'object' && result.status === 'error') {
      this.chosenZoneId = 0;
      this.chosenZoneTitle = '';
      this.hideModal();
      window.BX.Sale.OrderAjaxComponent.sendRequest();
    }
  }

  ymapsReady() {
    if (window.ymaps && window.ymaps.ready) {
      ymaps.ready(() => {
        if (!this.centerMaps) {
          this.showError(BX.message('TWINPX_JS_NO_REGION'));
          return;
        }

        //geo code
        const zdGeocoder = ymaps.geocode(this.centerMaps, {
          results: 1,
        });

        zdGeocoder.then(async (res) => {
          // first result, its coords and bounds
          let firstGeoObject = res.geoObjects.get(0);
          firstGeoObjectCoords = firstGeoObject.geometry.getCoordinates();
          this.regionBounds = firstGeoObject.properties.get('boundedBy');
          this.chosenCoords = firstGeoObjectCoords;

          let MyBalloonLayout = ymaps.templateLayoutFactory.createClass(
            `
            <div class="twpx-zd-balloon">
              <div class="twpx-zd-balloon-close"></div>
              $[properties.balloonContent]
            </div>
          `,
            {
              build: function () {
                MyBalloonLayout.superclass.build.call(this);
                document
                  .querySelector('#TwpxZdModal .twpx-zd-balloon-close')
                  .addEventListener('click', (e) => {
                    e.preventDefault();
                    this.ymapsMap.balloon.close();
                  });
              },
            }
          );

          //set map
          this.ymapsMap = new ymaps.Map(
            this.ymap,
            {
              center: firstGeoObjectCoords,
              zoom: 9,
              controls: ['geolocationControl', 'searchControl', 'zoomControl'],
            },
            {
              suppressMapOpenBlock: true,
            }
          );

          this.ymapsMap.events.add('click', function (e) {
            this.highlightResult(e);
          });

          this.deliveryPoint = new ymaps.GeoObject(
            {
              geometry: {
                type: 'Point',
                coordinates: this.ymapsMap.getCenter(),
              },
              properties: {
                balloonContent: ``,
              },
            },
            {
              preset: 'islands#violetCircleDotIcon',
              draggable: true,
              balloonLayout: MyBalloonLayout,
              hideIconOnBalloonOpen: false,
            }
          );

          this.deliveryPoint.events.add('click', () => {
            this.highlightResult(this.deliveryPoint);
          });

          this.ymapsMap.geoObjects.add(this.deliveryPoint);

          //search placeholder
          let searchControl = this.ymapsMap.controls.get('searchControl');
          searchControl.options.set({
            noPlacemark: true,
            placeholderContent: BX.message('TWINPX_JS_CONTROL_NAME'),
          });

          //get zones
          let promise = new Promise(async (res, rej) => {
            if (!this.polygons) {
              if (window.BX) {
                BX.ajax
                  .runComponentAction(
                    'twinpx:zones.delivery',
                    'getDeliveryZone',
                    {
                      mode: 'class',
                      method: 'post', //По умолчанию, POST.
                      data: { id: id }, //ID зоны доставки
                    }
                  )
                  .then(
                    (response) => {
                      this.polygons = response;
                      if (this.polygons) {
                        res(this.polygons);
                      }
                    },
                    (error) => {
                      rej(error);
                    }
                  );
              }
            }
          });

          promise.then(
            () => {
              this.deliveryZones = ymaps
                .geoQuery(this.polygons)
                .addToMap(this.ymapsMap);

              this.deliveryZones.each((obj) => {
                obj.options.set({
                  fillColor: obj.properties.get('fill'),
                  fillOpacity: obj.properties.get('fill-opacity'),
                  strokeColor: obj.properties.get('stroke'),
                  strokeWidth: obj.properties.get('stroke-width'),
                  strokeOpacity: obj.properties.get('stroke-opacity'),
                  zIndex: obj.properties.get('zIndex'),
                });
                this.zoneOpacity = obj.properties.get('fill-opacity');

                /*obj.properties.set(
                  'balloonContent',
                  `Минимальная стоимость за 1 м<sup>3</sup>: ${obj.properties.get(
                    'min-price'
                  )}р<br>
                  Добавочная стоимость за 1 м<sup>3</sup>: ${obj.properties.get(
                    'added-value'
                  )}р<br>
                  Максимальный объём: ${obj.properties.get(
                    'max-volume'
                  )}м<sup>3</sup>`
                );*/

                obj.events.add('click', (e) => {
                  e.stopPropagation();
                  this.deliveryPoint.geometry.setCoordinates(e.get('coords'));
                  this.highlightResult(this.deliveryPoint);
                });
              });

              //map bounds
              /*this.polygonsBounds =
                  this.deliveryZones.getBounds();
                this.ymapsMap.setBounds(
                  this.polygonsBounds,
                  { checkZoomRange: true }
                );*/
              //bounds for the region
              /*this.ymapsMap.setBounds(
                  this.regionBounds, //region
                  {
                    checkZoomRange: true,
                  }
                );*/

              // Проверим попадание результата поиска в одну из зон доставки.
              searchControl.events.add('resultshow', function (e) {
                this.highlightResult(
                  searchControl.getResultsArray()[e.get('index')]
                );
              });

              // Проверим попадание метки геолокации в одну из зон доставки.
              this.ymapsMap.controls
                .get('geolocationControl')
                .events.add('locationchange', function (e) {
                  this.highlightResult(e.get('geoObjects').get(0));
                });

              this.ymapsMap.events.add('click', (e) => {
                e.stopPropagation();
                this.deliveryPoint.balloon.close();
              });

              // При перемещении метки сбрасываем подпись, содержимое балуна и перекрашиваем метку.
              this.deliveryPoint.events.add('dragstart', function () {
                this.deliveryPoint.properties.set({
                  balloonContent: '',
                });
                this.deliveryPoint.options.set('iconColor', 'gray');
              });

              // По окончании перемещения метки вызываем функцию выделения зоны доставки.
              this.deliveryPoint.events.add('dragend', function () {
                this.highlightResult(this.deliveryPoint);
              });

              this.highlightResult(this.deliveryPoint);
            },
            (error) => {
              this.showError(error);
              this.highlightResult(this.deliveryPoint);
            }
          );
        });
      });
    }
  }

  async highlightResult(obj) {
    // Сохраняем координаты переданного объекта.
    var coords = obj.geometry
        ? obj.geometry.getCoordinates()
        : obj.get('coords'), //в obj может быть событие click из this.ymapsMap.events
      // Находим полигон, в который входят переданные координаты.
      polygon = this.deliveryZones.searchContaining(coords).get(0);

    this.chosenCoords = coords;

    if (polygon) {
      // Уменьшаем прозрачность всех полигонов, кроме того, в который входят переданные координаты.
      this.deliveryZones.setOptions('fillOpacity', this.zoneOpacity);
      polygon.options.set('fillOpacity', 1 * this.zoneOpacity + 0.1);
      // Перемещаем метку с подписью в переданные координаты и перекрашиваем её в цвет полигона.
      this.deliveryPoint.geometry.setCoordinates(coords);
      this.deliveryPoint.options.set(
        'iconColor',
        polygon.properties.get('fill')
      );

      // Задаем подпись для метки.
      if (typeof obj.getThoroughfare === 'function') {
        //if search
        //remember zone id
        this.chosenZoneId = polygon.properties.get('id');
        this.chosenZoneTitle = polygon.properties.get('title');
        this.chosenAddress = getAddress(obj);

        //balloon
        this.deliveryPoint.properties.set({
          balloonContent: `
          <div style="font: bold 18px 'Open Sans', Arial, sans-serif; margin-bottom: 17px;">${polygon.properties.get(
            'title'
          )}</div>
          <div style="font: normal 14px 'Open Sans', Arial, sans-serif; margin-bottom: 2px;">${
            this.chosenAddress
          }</div>
          <div style="height: 30px; display: flex; align-items: center;">
            <div style="width: 16px; height: 16px; animation: circle 1.3s infinite linear; border: 2px solid #d0d0d0; border-radius: 50%; border-right-color: transparent;"></div>
          </div>
          `,
        });
        this.deliveryPoint.balloon.open();

        //load the price
        const price = await this.getPrice();
        this.deliveryPoint.properties.set({
          balloonContent: `
          <div style="font: bold 18px 'Open Sans', Arial, sans-serif; margin-bottom: 17px;">${polygon.properties.get(
            'title'
          )}</div>
          <div style="font: normal 14px 'Open Sans', Arial, sans-serif; margin-bottom: 2px;">${
            this.chosenAddress
          }</div>
          <div style="height: 30px; font: bold 14px 'Open Sans', Arial, sans-serif; display: flex; align-items: center;">${price}</div>
        `,
        });
      } else {
        // Если вы не хотите, чтобы при каждом перемещении метки отправлялся запрос к геокодеру,
        // закомментируйте код ниже.
        ymaps.geocode(coords, { results: 1 }).then(async function (res) {
          //remember zone id
          this.chosenZoneId = polygon.properties.get('id');
          this.chosenZoneTitle = polygon.properties.get('title');
          //balloon
          var obj = res.geoObjects.get(0);

          this.chosenAddress = getAddress(obj);

          //balloon
          this.deliveryPoint.properties.set({
            balloonContent: `
            <div style="font: bold 18px 'Open Sans', Arial, sans-serif; margin-bottom: 17px;">${polygon.properties.get(
              'title'
            )}</div>
            <div style="font: normal 14px 'Open Sans', Arial, sans-serif; margin-bottom: 2px;">${
              this.chosenAddress
            }</div>
            <div style="height: 30px; display: flex; align-items: center;">
              <div style="width: 16px; height: 16px; animation: circle 1.3s infinite linear; border: 2px solid #d0d0d0; border-radius: 50%; border-right-color: transparent;"></div>
            </div>
            `,
          });
          this.deliveryPoint.balloon.open();

          //load the price
          const price = await this.getPrice();
          this.deliveryPoint.properties.set({
            balloonContent: `
          <div style="font: bold 18px 'Open Sans', Arial, sans-serif; margin-bottom: 17px;">${polygon.properties.get(
            'title'
          )}</div>
          <div style="font: normal 14px 'Open Sans', Arial, sans-serif; margin-bottom: 2px;">${
            this.chosenAddress
          }</div>
          <div style="height: 30px; font: bold 14px 'Open Sans', Arial, sans-serif; display: flex; align-items: center;">${price}</div>
        `,
          });
        });
      }

      //center the map
      this.ymapsMap.panTo(coords);
      //Enable button
      this.btnDefault.classList.remove('twpx-zd-modal-btn--disabled');
    } else {
      this.chosenZoneId = 0;
      this.chosenZoneTitle = '';
      // Если переданные координаты не попадают в полигон, то задаём стандартную прозрачность полигонов.
      this.deliveryZones.setOptions('fillOpacity', this.zoneOpacity);
      // Перемещаем метку по переданным координатам.
      this.deliveryPoint.geometry.setCoordinates(coords);
      // Задаём контент балуна и метки.
      this.deliveryPoint.properties.set({
        balloonContent: BX.message('TWINPX_EMPTY_ZONE'),
      });
      setTimeout(() => {
        this.deliveryPoint.balloon.open();
      }, 0);
      // Перекрашиваем метку в чёрный цвет.
      this.deliveryPoint.options.set('iconColor', 'black');
      //Disable button
      this.btnDefault.classList.add('twpx-zd-modal-btn--disabled');
    }

    function getAddress(obj) {
      /*var address = [
        obj.getThoroughfare(),
        obj.getPremiseNumber(),
        obj.getPremise(),
      ].join(' ');*/
      let address = obj.properties._data.name;
      this.chosenAddressWithCity = obj.getAddressLine();
      if (address.trim() === '') {
        address = obj.getAddressLine();
      }
      return address;
    }
  }

  ymapsReset() {
    //set polygon bounds
    if (this.polygonsBounds) {
      this.ymapsMap.setBounds(this.polygonsBounds, { checkZoomRange: true });
    }
    //get map center
    let centerCoords = this.ymapsMap.getCenter();
    this.chosenCoords = centerCoords;
    //placemark in the center
    this.deliveryPoint.geometry.setCoordinates(centerCoords);
    //hide balloon
    this.deliveryPoint.balloon.close();
    this.deliveryPoint.options.set('iconColor', 'gray');
  }

  findCheckbox() {
    document
      .querySelectorAll(`[name=${this.addressInput.name}]`)
      .forEach((checkbox) => {
        if (checkbox.value === this.addressInput.value) {
          this.checkbox = checkbox;
        }
      });
  }

  onBeforeSendRequest() {
    if (window.BX && BX.Event && BX.Event.EventEmitter) {
      BX.Event.EventEmitter.subscribe(
        'BX.Sale.OrderAjaxComponent:onBeforeSendRequest',
        (event) => {
          this.findCheckbox();

          //if there is no zones delivery for some location
          if (!this.checkbox || !this.checkbox.parentNode) {
            return;
          }

          let emptySpan = document.createElement('span');
          emptySpan.id = `ZONES_DELIVERY_SPAN`;
          this.checkbox.parentNode.appendChild(emptySpan);
          let counter = 0;
          //wait for the reload
          let intervalId = setInterval(() => {
            if (!document.getElementById(`ZONES_DELIVERY_SPAN`)) {
              clearInterval(intervalId);
              this.initAddressControl();
              this.getChosenZoneFromCookies();
              this.showZoneTitle();
            } else if (++counter >= 100) {
              clearInterval(intervalId);
            }
          }, 200);
        }
      );
    }
  }

  showZoneTitle() {
    if (!document.querySelector('#twpx-zd-showmodal') || !this.chosenZoneTitle)
      return;

    const div = document.createElement('div');
    div.id = 'twpx-zd-showmodal-zonename';
    div.style.display = 'block';
    div.style.paddingTop = '15px';
    div.textContent = this.chosenZoneTitle;

    const title = document.createElement('div');
    title.style.color = '#8d8d8d';
    title.style.fontSize = '13px';
    title.style.lineHeight = '1.5';
    title.textContent = BX.message('TWINPX_JS_ZONE_TITLE');

    div.prepend(title);

    document.querySelector('#twpx-zd-showmodal').after(div);
  }

  async getPrice() {
    let result;

    if (window.BX && BX.ajax) {
      const promise = new Promise((res, rej) => {
        BX.ajax
          .runComponentAction('twinpx:zones.delivery', 'getZonePrice', {
            mode: 'class', //это означает, что мы хотим вызывать действие из class.php или ajax.php
            data: {
              zid: this.chosenZoneId,
            }, //data {Object|FormData} данные будут автоматически замаплены на параметры метода
          })
          .then(
            (response) => {
              if (response.status === 'success') {
                res(response.data);
              } else {
                console.log(response.errors);
              }
            },
            (error) => {
              //сюда будут приходить все ответы, у которых status !== 'success'
              rej(error);
            }
          );
      });

      await promise.then((res) => {
        result = res;
      });
    }

    return result;
  }
}

window.addEventListener('load', () => {
  if (
    window.TwinpxZonesDelivery &&
    typeof window.TwinpxZonesDelivery === 'object' &&
    window.TwinpxZonesDelivery.items &&
    typeof window.TwinpxZonesDelivery.items === 'object' &&
    window.TwinpxZonesDelivery.items.forEach
  ) {
    window.TwinpxZonesDelivery.showModal = () => {
      //узнать активный чекбокс
      window.TwinpxZonesDelivery.items.forEach((item) => {
        document
          .querySelectorAll(`[name=${item.addressInput.name}]`)
          .forEach((checkbox) => {
            if (
              checkbox.value === item.addressInput.value &&
              checkbox.checked
            ) {
              if (item.inst) {
                //взять тот экземпляр класса, который относится к этому чекбоксу и вызвать окно
                item.inst.showModal();
              }
            }
          });
      });
    };
    window.TwinpxZonesDelivery.items.forEach((zdObj) => {
      zdObj.inst = new TwinpxZonesDeliveryClass(zdObj);
    });
  }
});
