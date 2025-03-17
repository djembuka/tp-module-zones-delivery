class TwinpxZonesDeliveryAddressControlClass {
  constructor(addressProperty) {
    this.addressProperty = addressProperty;
    this.addressControl;
    this.chosenAddress;
    this.init();
  }

  init() {
    this.initAddressControl();
  }

  //methods
  findAddressControl() {
    let addressControl;
    if (this.addressProperty && this.addressProperty.forEach) {
      addressControl = undefined;
      this.addressProperty.forEach((name) => {
        addressControl =
          document.querySelector(`[name=${name}]`) || addressControl;
      });
    }

    return addressControl;
  }

  initAddressControl() {
    this.addressControl = this.findAddressControl();

    if (
      !this.addressControl ||
      !window.TwinpxZonesDelivery.activeItem ||
      !window.TwinpxZonesDelivery.activeItem.inst.addressInput
    ) {
      return;
    }

    this.addressControl.addEventListener('blur', () => {
      //check if active zone delivery exists
      if (!window.TwinpxZonesDelivery.activeItem) {
        return;
      }

      this.chosenAddress = this.addressControl.value;
      window.TwinpxZonesDelivery.ymap.fromAddressBlur();
    });
  }
}

class TwinpxZonesDeliveryModalClass {
  constructor() {
    //elems
    this.modal = document.getElementById('TwpxZdModal');
    this.modalBody = this.modal.querySelector('.twpx-zd-modal-body');
    this.modalClose = this.modal.querySelector('.twpx-zd-modal-close');
    this.btnDefault = this.modal.querySelector('.twpx-zd-modal-btn--default');
    this.btnClose = this.modal.querySelector('.twpx-zd-modal-btn--close');
    this.modalContent = this.modal.querySelector('.twpx-zd-modal-content');
    this.modalError = this.modal.querySelector('.twpx-zd-modal-error');

    this.init();
  }

  init() {
    this.appendToBody();
    this.addEvents();
  }

  appendToBody() {
    document.querySelector('body').append(this.modal);
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
      window.TwinpxZonesDelivery.activeItem.inst.sendZoneId();
    });
  }

  //methods
  showModal() {
    //remove page scroll
    document.querySelector('body').classList.add('twpx-zd-no-scroll');
    // window.TwinpxZonesDelivery.ymap.getCenterMapsFromCookies();
    //show errors if needed
    if (!window.TwinpxZonesDelivery.ymapsUrl) {
      this.showError(BX.message('TWINPX_JS_NO_YMAP_KEY'));
      this.modal.classList.add('twpx-zd-modal--show');
      this.modal.classList.add('twpx-zd-modal--z');
      return;
    } else if (!window.TwinpxZonesDelivery.centerMaps) {
      this.showError(BX.message('TWINPX_JS_NO_REGION'));
      this.modal.classList.add('twpx-zd-modal--show');
      this.modal.classList.add('twpx-zd-modal--z');
      return;
    } else if (window.TwinpxZonesDelivery.ymap.ymapsMap) {
      window.TwinpxZonesDelivery.ymap.fromShowModal(() => {
        this.modal.classList.add('twpx-zd-modal--show');
        this.modal.classList.add('twpx-zd-modal--z');
      });
    }
  }

  showError(message) {
    this.modalContent.classList.add('twpx-zd-modal-content--error');
    this.modalError.innerHTML = `${message}`;
  }

  hideModal() {
    //remove page scroll
    document.querySelector('body').classList.remove('twpx-zd-no-scroll');

    this.modal.classList.remove('twpx-zd-modal--show');

    setTimeout(() => {
      this.modal.classList.remove('twpx-zd-modal--z');
    }, 500);
  }
}

class TwinpxZonesDeliveryYmapClass {
  constructor() {
    //elems
    this.ymap = document.getElementById('TwpxZdYmap');

    this.zoneOpacity = 0.1;
    this.ymapsMap;
    this.deliveryPoint;
    this.searchControl;

    this.init();
  }

  init() {
    this.ymapsReady();
  }

  fromAddressBlur() {
    this.getCenterMapsFromCookies();

    let addressGeocoderString =
      String(window.TwinpxZonesDelivery.addressType) === '1'
        ? `${window.TwinpxZonesDelivery.centerMaps}, ${window.TwinpxZonesDelivery.address.chosenAddress}`
        : window.TwinpxZonesDelivery.address.chosenAddress;

    let addressGeocoder = ymaps.geocode(addressGeocoderString, {
      results: 1,
    });

    addressGeocoder
      .then(async (res) => {
        let geoObject = res.geoObjects.get(0);
        const activeDelivery = window.TwinpxZonesDelivery.activeItem.inst;

        if (!geoObject) {
          activeDelivery.chosenZoneId = 0;
          activeDelivery.noDeliveryFlag = true;
          activeDelivery.chosenZoneTitle = '';
          activeDelivery.sendZoneId(true);
          this.ymapsReset();
          return;
        }

        let coords = geoObject.geometry.getCoordinates();
        this.chosenCoords = coords;

        let promise = new Promise(async (res, rej) => {
          if (!activeDelivery.polygons) {
            if (window.BX) {
              BX.ajax
                .runComponentAction(
                  'twinpx:zones.delivery',
                  'getDeliveryZone',
                  {
                    mode: 'class',
                    method: 'post',
                    data: {
                      id: activeDelivery.id,
                    }, //ID доставки
                  }
                )
                .then(
                  (response) => {
                    activeDelivery.polygons = response;
                    if (activeDelivery.polygons) {
                      res();
                    }
                  },
                  (error) => {
                    rej(error);
                  }
                );
            }
          } else {
            res();
          }
        });

        promise.then(
          () => {
            activeDelivery.deliveryZones =
              activeDelivery.deliveryZones ||
              ymaps.geoQuery(activeDelivery.polygons);

            let polygon = activeDelivery.deliveryZones
              .searchContaining(coords)
              .get(0);

            if (polygon) {
              let newId = polygon.properties.get('id');
              if (activeDelivery.chosenZoneId !== newId) {
                activeDelivery.chosenZoneId = newId;
                activeDelivery.chosenZoneTitle =
                  polygon.properties.get('title');
                activeDelivery.sendZoneId(true);
              }
            } else {
              activeDelivery.chosenZoneId = 0;
              activeDelivery.noDeliveryFlag = true;
              activeDelivery.chosenZoneTitle = '';
              activeDelivery.sendZoneId(true);
            }

            //set placemark on the map
            this.deliveryPoint.geometry.setCoordinates(coords);
            this.ymapsMap.setZoom(12);

            this.highlightResult(this.deliveryPoint);
          },
          (error) => {
            window.TwinpxZonesDelivery.modal.showError(error);
          }
        );
      })
      .catch((error) => {
        console.log(error); // вывести ошибку
      });
  }

  fromShowModal(callback) {
    //polygones
    const inst = this;
    if (
      window.TwinpxZonesDelivery.activeItem &&
      !window.TwinpxZonesDelivery.activeItem.inst.deliveryCollection
    ) {
      this.getZones(showCenter);
    } else {
      showCenter();
    }

    function showCenter() {
      // geo code
      const zdGeocoder = ymaps.geocode(window.TwinpxZonesDelivery.centerMaps, {
        results: 1,
      });
      zdGeocoder.then(async (res) => {
        let firstGeoObject = res.geoObjects.get(0);
        inst.highlightResult(firstGeoObject);
        inst.regionBounds = firstGeoObject.properties.get('boundedBy');
        inst.ymapsMap.setBounds(inst.regionBounds);
        callback();
      });
    }
  }

  getCenterMapsFromCookies() {
    window.TwinpxZonesDelivery.centerMaps =
      decodeURI(
        document.cookie.replace(
          /(?:(?:^|.*;\s*)ZONE_LOCATION\s*\=\s*([^;]*).*$)|^.*$/,
          '$1'
        )
      ) || window.TwinpxZonesDelivery.centerMaps;
  }

  initYmapsMap(callback) {
    //geo code
    const zdGeocoder = ymaps.geocode(window.TwinpxZonesDelivery.centerMaps, {
      results: 1,
    });

    zdGeocoder.then(async (res) => {
      // first result, its coords and bounds
      let firstGeoObject = res.geoObjects.get(0);
      let firstGeoObjectCoords = firstGeoObject.geometry.getCoordinates();
      this.regionBounds = firstGeoObject.properties.get('boundedBy');
      this.chosenCoords = firstGeoObjectCoords;
      let t = this;

      let MyBalloonLayout = ymaps.templateLayoutFactory.createClass(
        `
        <div class="twpx-zd-balloon">
          <div class="twpx-zd-balloon-close"></div>
          $[properties.balloonContent]
        </div>
      `,
        {
          build() {
            MyBalloonLayout.superclass.build.call(this);
            document
              .querySelector('#TwpxZdModal .twpx-zd-balloon-close')
              .addEventListener('click', (e) => {
                e.preventDefault();
                t.ymapsMap.balloon.close();
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

      this.ymapsMap.events.add('click', (e) => {
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
      this.searchControl = this.ymapsMap.controls.get('searchControl');
      this.searchControl.options.set({
        noPlacemark: true,
        placeholderContent: BX.message('TWINPX_JS_CONTROL_NAME'),
      });

      if (callback) {
        callback();
      }
    });
  }

  ymapsReady() {
    if (window.ymaps && window.ymaps.ready) {
      ymaps.ready(() => {
        if (!window.TwinpxZonesDelivery.centerMaps) {
          window.TwinpxZonesDelivery.modal.showError(
            BX.message('TWINPX_JS_NO_REGION')
          );
          return;
        }

        this.initYmapsMap();
      });
    }
  }

  getZones(callback) {
    //get zones
    let promise = new Promise(async (res, rej) => {
      if (!window.TwinpxZonesDelivery.activeItem.inst.polygons) {
        if (window.BX) {
          BX.ajax
            .runComponentAction('twinpx:zones.delivery', 'getDeliveryZone', {
              mode: 'class',
              method: 'post', //По умолчанию, POST.
              data: {
                id: window.TwinpxZonesDelivery.activeItem.id,
              }, //ID доставки
            })
            .then(
              (response) => {
                window.TwinpxZonesDelivery.activeItem.inst.polygons =
                  response.data;
                if (window.TwinpxZonesDelivery.activeItem.inst.polygons) {
                  res(window.TwinpxZonesDelivery.activeItem.inst.polygons);
                }
              },
              (error) => {
                rej(error);
              }
            );
        }
      } else {
        this.addPolygones();
      }
    });

    promise.then(
      () => {
        window.TwinpxZonesDelivery.activeItem.inst.deliveryZones =
          ymaps.geoQuery(window.TwinpxZonesDelivery.activeItem.inst.polygons);

        window.TwinpxZonesDelivery.activeItem.inst.deliveryCollection =
          new ymaps.GeoObjectCollection();

        this.addPolygones();

        this.ymapsMap.geoObjects.add(
          window.TwinpxZonesDelivery.activeItem.inst.deliveryCollection
        );

        // Проверим попадание результата поиска в одну из зон доставки.
        this.searchControl.events.add('resultshow', (e) => {
          this.highlightResult(
            this.searchControl.getResultsArray()[e.get('index')]
          );
        });

        // Проверим попадание метки геолокации в одну из зон доставки.
        this.ymapsMap.controls
          .get('geolocationControl')
          .events.add('locationchange', (e) => {
            this.highlightResult(e.get('geoObjects').get(0));
          });

        this.ymapsMap.events.add('click', (e) => {
          e.stopPropagation();
          this.deliveryPoint.balloon.close();
        });

        // При перемещении метки сбрасываем подпись, содержимое балуна и перекрашиваем метку.
        this.deliveryPoint.events.add('dragstart', () => {
          this.deliveryPoint.properties.set({
            balloonContent: '',
          });
          this.deliveryPoint.options.set('iconColor', 'gray');
        });

        // По окончании перемещения метки вызываем функцию выделения зоны доставки.
        this.deliveryPoint.events.add('dragend', () => {
          this.highlightResult(this.deliveryPoint);
        });

        this.highlightResult(this.deliveryPoint);

        if (callback) {
          callback();
        }
      },
      (error) => {
        window.TwinpxZonesDelivery.modal.showError(error);
        this.highlightResult(this.deliveryPoint);
      }
    );
  }

  addPolygones() {
    window.TwinpxZonesDelivery.activeItem.inst.deliveryZones.each((obj) => {
      window.TwinpxZonesDelivery.activeItem.inst.deliveryCollection.add(obj);

      obj.options.set({
        fillColor: obj.properties.get('fill'),
        fillOpacity: obj.properties.get('fill-opacity'),
        strokeColor: obj.properties.get('stroke'),
        strokeWidth: obj.properties.get('stroke-width'),
        strokeOpacity: obj.properties.get('stroke-opacity'),
        zIndex: obj.properties.get('zIndex'),
      });
      this.zoneOpacity = obj.properties.get('fill-opacity');

      obj.events.add('click', (e) => {
        e.stopPropagation();
        this.deliveryPoint.geometry.setCoordinates(e.get('coords'));
        this.highlightResult(this.deliveryPoint);
      });
    });
  }

  async highlightResult(obj) {
    // Сохраняем координаты переданного объекта.
    let coords = obj.geometry
        ? obj.geometry.getCoordinates()
        : obj.get('coords'), //в obj может быть событие click из this.ymapsMap.events
      // Находим полигон, в который входят переданные координаты.
      polygon = window.TwinpxZonesDelivery.activeItem.inst.deliveryZones
        .searchContaining(coords)
        .get(0);

    this.chosenCoords = coords;

    if (polygon) {
      // Уменьшаем прозрачность всех полигонов, кроме того, в который входят переданные координаты.
      window.TwinpxZonesDelivery.activeItem.inst.deliveryZones.setOptions(
        'fillOpacity',
        this.zoneOpacity
      );
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
        window.TwinpxZonesDelivery.activeItem.inst.chosenZoneId =
          polygon.properties.get('id');
        window.TwinpxZonesDelivery.activeItem.inst.chosenZoneTitle =
          polygon.properties.get('title');
        this.chosenAddress = getAddress(this, obj);

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
        const price =
          await window.TwinpxZonesDelivery.activeItem.inst.getPrice();
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
        ymaps.geocode(coords, { results: 1 }).then(async (res) => {
          //remember zone id
          window.TwinpxZonesDelivery.activeItem.inst.chosenZoneId =
            polygon.properties.get('id');
          window.TwinpxZonesDelivery.activeItem.inst.chosenZoneTitle =
            polygon.properties.get('title');
          //balloon
          var obj = res.geoObjects.get(0);

          this.chosenAddress = getAddress(this, obj);

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
          const price =
            await window.TwinpxZonesDelivery.activeItem.inst.getPrice();
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
      window.TwinpxZonesDelivery.modal.btnDefault.classList.remove(
        'twpx-zd-modal-btn--disabled'
      );
    } else {
      window.TwinpxZonesDelivery.activeItem.inst.chosenZoneId = 0;
      window.TwinpxZonesDelivery.activeItem.inst.chosenZoneTitle = '';
      // Если переданные координаты не попадают в полигон, то задаём стандартную прозрачность полигонов.
      window.TwinpxZonesDelivery.activeItem.inst.deliveryZones.setOptions(
        'fillOpacity',
        this.zoneOpacity
      );
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
      window.TwinpxZonesDelivery.modal.btnDefault.classList.add(
        'twpx-zd-modal-btn--disabled'
      );
    }

    function getAddress(t, obj) {
      /*var address = [
        obj.getThoroughfare(),
        obj.getPremiseNumber(),
        obj.getPremise(),
      ].join(' ');*/
      let address = obj.properties._data.name;
      window.TwinpxZonesDelivery.activeItem.inst.chosenAddressWithCity =
        obj.getAddressLine();
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

  clearPoligons() {
    window.TwinpxZonesDelivery.items.forEach((item) => {
      if (item.inst.deliveryCollection) {
        item.inst.deliveryCollection.removeAll();
      }
    });
  }
}

class TwinpxZonesDeliveryClass {
  constructor(zdObj) {
    //variables
    this.zdObj = zdObj;
    this.id = zdObj.id;
    this.zones = zdObj.zones || {};
    this.addressInput = zdObj.addressInput;
    this.chosenZoneTitle = zdObj.chosenZoneTitle;
    this.chosenZoneId = zdObj.chosenZoneId;
    this.noDeliveryFlag = false;
    this.chosenAddressWithCity;

    this.init();
  }

  init() {
    this.onBeforeSendRequest();
    this.showZoneTitle();
  }

  //methods
  async sendZoneId(blurAddressControlFlag) {
    const formData = new FormData();
    formData.append('did', this.id);
    formData.append('zid', this.chosenZoneId);
    formData.append('coords', window.TwinpxZonesDelivery.ymap.chosenCoords);
    let response = await fetch(
      `/bitrix/services/main/ajax.php?mode=class&c=twinpx:zones.delivery&action=setZone`,
      {
        method: 'POST',
        body: formData,
      }
    );

    let result = await response.json();

    if (typeof result === 'object' && result.status === 'success') {
      window.TwinpxZonesDelivery.address.initAddressControl();
      if (
        window.TwinpxZonesDelivery.address.addressControl &&
        !blurAddressControlFlag
      ) {
        window.TwinpxZonesDelivery.address.addressControl.value =
          this.chosenAddressWithCity;
      }
      window.TwinpxZonesDelivery.modal.hideModal();
      window.BX.Sale.OrderAjaxComponent.sendRequest();
    } else if (typeof result === 'object' && result.status === 'error') {
      this.chosenZoneId = 0;
      this.chosenZoneTitle = '';
      window.TwinpxZonesDelivery.modal.hideModal();
      window.BX.Sale.OrderAjaxComponent.sendRequest();
    }
  }

  findCheckbox() {
    document
      .querySelectorAll(`[name=${this.addressInput.name}]`)
      .forEach((checkbox) => {
        if (String(checkbox.value) === String(this.addressInput.value)) {
          this.checkbox = checkbox;
        }
      });
  }

  onBeforeSendRequest() {
    if (window.BX && BX.Event && BX.Event.EventEmitter) {
      BX.Event.EventEmitter.subscribe(
        'BX.Sale.OrderAjaxComponent:onBeforeSendRequest',
        () => {
          this.findCheckbox();

          //if there is no zones delivery for some location
          if (
            !this.checkbox ||
            !this.checkbox.parentNode ||
            !this.checkbox.checked
          ) {
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
              if (!window.TwinpxZonesDelivery.ymap.ymapsMap) {
                window.TwinpxZonesDelivery.ymap.initYmapsMap(on);
              }

              const t = this;
              on();

              function on() {
                let id;
                if (document.getElementById('twpx-zd-showmodal')) {
                  id = document
                    .getElementById('twpx-zd-showmodal')
                    .getAttribute('data-id');
                  window.TwinpxZonesDelivery.activeItem =
                    window.TwinpxZonesDelivery.items.find(
                      (item) => String(item.id) === String(id)
                    );
                }
                if (id && String(t.id) === String(id)) {
                  window.TwinpxZonesDelivery.address.initAddressControl();
                  window.TwinpxZonesDelivery.ymap.getCenterMapsFromCookies();
                  t.getChosenZoneFromCookies();
                  t.showZoneTitle();
                  window.TwinpxZonesDelivery.ymap.clearPoligons();
                  window.TwinpxZonesDelivery.ymap.getZones();
                }
              }
            } else if (++counter >= 100) {
              clearInterval(intervalId);
            }
          }, 200);
        }
      );
    }
  }

  getChosenZoneFromCookies() {
    //id
    window.TwinpxZonesDelivery.activeItem.inst.chosenZoneId =
      decodeURI(
        document.cookie.replace(
          /(?:(?:^|.*;\s*)ZONE_ID\s*\=\s*([^;]*).*$)|^.*$/,
          '$1'
        )
      ) || 0;
    //title
    window.TwinpxZonesDelivery.activeItem.inst.chosenZoneTitle =
      window.TwinpxZonesDelivery.activeItem.inst.zones[
        window.TwinpxZonesDelivery.activeItem.inst.chosenZoneId
      ] || '';
  }

  showZoneTitle() {
    if (!document.querySelector('#twpx-zd-showmodal')) return;

    if (!this.chosenZoneTitle && !this.noDeliveryFlag) {
      return;
    }

    if (document.getElementById('twpx-zd-showmodal-zonename')) {
      document.getElementById('twpx-zd-showmodal-zonename').remove();
    }

    const div = document.createElement('div');
    div.id = 'twpx-zd-showmodal-zonename';
    div.style.display = 'block';
    div.style.paddingTop = '15px';
    div.textContent = this.noDeliveryFlag
      ? BX.message('TWINPX_JS_NO_DELIVERY')
      : this.chosenZoneTitle;

    const title = document.createElement('div');
    title.style.color = '#8d8d8d';
    title.style.fontSize = '13px';
    title.style.lineHeight = '1.5';
    title.textContent = BX.message('TWINPX_JS_ZONE_TITLE');

    if (!this.noDeliveryFlag) {
      div.prepend(title);
    }

    this.noDeliveryFlag = false;
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

window.addEventListener('DOMContentLoaded', () => {
  if (
    typeof window.TwinpxZonesDelivery === 'object' &&
    window.TwinpxZonesDelivery.items &&
    window.TwinpxZonesDelivery.items.forEach
  ) {
    //delivery instances
    window.TwinpxZonesDelivery.items.forEach((zdObj) => {
      zdObj.inst = new TwinpxZonesDeliveryClass(zdObj);
    });

    //modal instance
    window.TwinpxZonesDelivery.modal = new TwinpxZonesDeliveryModalClass();
    //ymap instance
    window.TwinpxZonesDelivery.ymap = new TwinpxZonesDeliveryYmapClass();
    //address instance
    window.TwinpxZonesDelivery.address =
      new TwinpxZonesDeliveryAddressControlClass(
        window.TwinpxZonesDelivery.addressProperty
      );

    //show modal event
    window.TwinpxZonesDelivery.showModal = (id) => {
      //init active item
      if (document.getElementById('twpx-zd-showmodal')) {
        let activeItemId = document
          .getElementById('twpx-zd-showmodal')
          .getAttribute('data-id');

        window.TwinpxZonesDelivery.activeItem =
          window.TwinpxZonesDelivery.items.find(
            (item) => String(item.id) === String(activeItemId)
          );
      }
      //show modal
      if (window.TwinpxZonesDelivery.activeItem) {
        window.TwinpxZonesDelivery.modal.showModal();
      }
    };
  }
});
