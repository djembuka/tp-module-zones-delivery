window.addEventListener('load', () => {
  window.TwinpxZonesDelivery = window.TwinpxZonesDelivery || {};

  //variables
  TwinpxZonesDelivery.fetchTimeout = 20000;
  TwinpxZonesDelivery.zones = window.TwinpxZonesDelivery.zones || {};
  TwinpxZonesDelivery.chosenZoneId;
  TwinpxZonesDelivery.chosenZoneTitle;
  TwinpxZonesDelivery.zoneOpacity = 0.1;
  TwinpxZonesDelivery.ymapsMap;
  TwinpxZonesDelivery.deliveryPoint;
  TwinpxZonesDelivery.chosenAddressWithCity;

  //elems
  TwinpxZonesDelivery.modal = document.getElementById('TwpxZdModal');
  TwinpxZonesDelivery.modalBody = TwinpxZonesDelivery.modal.querySelector(
    '.twpx-zd-modal-body'
  );
  TwinpxZonesDelivery.modalClose = TwinpxZonesDelivery.modal.querySelector(
    '.twpx-zd-modal-close'
  );
  TwinpxZonesDelivery.btnDefault = TwinpxZonesDelivery.modal.querySelector(
    '.twpx-zd-modal-btn--default'
  );
  TwinpxZonesDelivery.btnClose = TwinpxZonesDelivery.modal.querySelector(
    '.twpx-zd-modal-btn--close'
  );
  TwinpxZonesDelivery.ymap =
    TwinpxZonesDelivery.modal.querySelector('#TwpxZdYmap');
  TwinpxZonesDelivery.modalContent = TwinpxZonesDelivery.modal.querySelector(
    '.twpx-zd-modal-content'
  );
  TwinpxZonesDelivery.modalError = TwinpxZonesDelivery.modal.querySelector(
    '.twpx-zd-modal-error'
  );
  TwinpxZonesDelivery.addressControl;

  //methods
  TwinpxZonesDelivery.showModal = function () {
    TwinpxZonesDelivery.getCenterMapsFromCookies();
    //show errors if needed
    if (!TwinpxZonesDelivery.ymapsUrl) {
      TwinpxZonesDelivery.showError(BX.message('TWINPX_JS_NO_YMAP_KEY'));
      TwinpxZonesDelivery.modal.classList.add('twpx-zd-modal--show');
      TwinpxZonesDelivery.modal.classList.add('twpx-zd-modal--z');
      return;
    } else if (!TwinpxZonesDelivery.centerMaps) {
      TwinpxZonesDelivery.showError(BX.message('TWINPX_JS_NO_REGION'));
      TwinpxZonesDelivery.modal.classList.add('twpx-zd-modal--show');
      TwinpxZonesDelivery.modal.classList.add('twpx-zd-modal--z');
      return;
    } else if (TwinpxZonesDelivery.ymapsMap) {
      //geo code
      const zdGeocoder = ymaps.geocode(TwinpxZonesDelivery.centerMaps, {
        results: 1,
      });

      zdGeocoder.then(async (res) => {
        let firstGeoObject = res.geoObjects.get(0);

        TwinpxZonesDelivery.highlightResult(firstGeoObject);

        //let firstGeoObjectCoords = firstGeoObject.geometry.getCoordinates();
        TwinpxZonesDelivery.regionBounds =
          firstGeoObject.properties.get('boundedBy');
        //TwinpxZonesDelivery.chosenCoords = firstGeoObjectCoords;
        TwinpxZonesDelivery.ymapsMap.setBounds(
          TwinpxZonesDelivery.regionBounds
        );

        TwinpxZonesDelivery.modal.classList.add('twpx-zd-modal--show');
        TwinpxZonesDelivery.modal.classList.add('twpx-zd-modal--z');
      });
    }
  };

  TwinpxZonesDelivery.getCenterMapsFromCookies = function () {
    TwinpxZonesDelivery.centerMaps =
      decodeURI(
        document.cookie.replace(
          /(?:(?:^|.*;\s*)ZONE_LOCATION\s*\=\s*([^;]*).*$)|^.*$/,
          '$1'
        )
      ) || TwinpxZonesDelivery.centerMaps;
  };

  TwinpxZonesDelivery.getChosenZoneFromCookies = function () {
    //id
    TwinpxZonesDelivery.chosenZoneId =
      decodeURI(
        document.cookie.replace(
          /(?:(?:^|.*;\s*)ZONE_ID\s*\=\s*([^;]*).*$)|^.*$/,
          '$1'
        )
      ) || 0;
    //title
    TwinpxZonesDelivery.chosenZoneTitle =
      TwinpxZonesDelivery.zones[TwinpxZonesDelivery.chosenZoneId] || '';
  };

  TwinpxZonesDelivery.showError = function (message) {
    TwinpxZonesDelivery.modalContent.classList.add(
      'twpx-zd-modal-content--error'
    );
    TwinpxZonesDelivery.modalError.innerHTML = `${message}`;
  };

  TwinpxZonesDelivery.hideError = function () {
    TwinpxZonesDelivery.modalContent.classList.remove(
      'twpx-zd-modal-content--error'
    );
    TwinpxZonesDelivery.modalError.innerHtml = ``;
  };

  TwinpxZonesDelivery.hideModal = function () {
    TwinpxZonesDelivery.modal.classList.remove('twpx-zd-modal--show');

    setTimeout(() => {
      TwinpxZonesDelivery.modal.classList.remove('twpx-zd-modal--z');
    }, 500);
  };

  TwinpxZonesDelivery.getRegion = function () {};

  //events
  TwinpxZonesDelivery.modalBody.addEventListener('click', (e) => {
    e.stopPropagation();
  });

  TwinpxZonesDelivery.modal.addEventListener('click', (e) => {
    e.preventDefault();
    TwinpxZonesDelivery.hideModal();
  });

  TwinpxZonesDelivery.modalClose.addEventListener('click', (e) => {
    e.preventDefault();
    TwinpxZonesDelivery.hideModal();
  });

  TwinpxZonesDelivery.btnClose.addEventListener('click', (e) => {
    e.preventDefault();
    TwinpxZonesDelivery.hideModal();
  });

  TwinpxZonesDelivery.findAddressControl = function () {
    if (
      TwinpxZonesDelivery.addressProperty &&
      TwinpxZonesDelivery.addressProperty.forEach
    ) {
      TwinpxZonesDelivery.addressControl = undefined;
      TwinpxZonesDelivery.addressProperty.forEach((name) => {
        TwinpxZonesDelivery.addressControl =
          document.querySelector(`[name=${name}]`) ||
          TwinpxZonesDelivery.addressControl;
      });
    }

    return TwinpxZonesDelivery.addressControl;
  };

  TwinpxZonesDelivery.initAddressControl = function () {
    TwinpxZonesDelivery.addressControl =
      TwinpxZonesDelivery.findAddressControl();

    if (
      !TwinpxZonesDelivery.addressControl ||
      !TwinpxZonesDelivery.addressInput
    ) {
      return;
    }
    TwinpxZonesDelivery.addressControl.addEventListener('blur', () => {
      //check if zones delivery is checked
      TwinpxZonesDelivery.findCheckbox();
      if (
        !TwinpxZonesDelivery.checkbox ||
        !TwinpxZonesDelivery.checkbox.checked
      ) {
        return;
      }

      //get zone id
      TwinpxZonesDelivery.chosenAddress =
        TwinpxZonesDelivery.addressControl.value;

      TwinpxZonesDelivery.getCenterMapsFromCookies();

      let addressGeocoder = ymaps.geocode(
        TwinpxZonesDelivery.centerMaps +
          ', ' +
          TwinpxZonesDelivery.chosenAddress,
        {
          results: 1,
        }
      );

      addressGeocoder
        .then(async (res) => {
          let geoObject = res.geoObjects.get(0);

          if (!geoObject) {
            TwinpxZonesDelivery.chosenZoneId = 0;
            TwinpxZonesDelivery.chosenZoneTitle = '';
            TwinpxZonesDelivery.sendZoneId(true);
            TwinpxZonesDelivery.ymapsReset();
            return;
          }

          let coords = geoObject.geometry.getCoordinates();
          TwinpxZonesDelivery.chosenCoords = coords;

          TwinpxZonesDelivery.deliveryZones =
            TwinpxZonesDelivery.deliveryZones ||
            ymaps.geoQuery(TwinpxZonesDelivery.polygons);

          let polygon = TwinpxZonesDelivery.deliveryZones
            .searchContaining(coords)
            .get(0);

          if (polygon) {
            let newId = polygon.properties.get('id');
            if (TwinpxZonesDelivery.chosenZoneId !== newId) {
              TwinpxZonesDelivery.chosenZoneId = newId;
              TwinpxZonesDelivery.chosenZoneTitle =
                polygon.properties.get('title');
              TwinpxZonesDelivery.sendZoneId(true);
            }
          } else {
            TwinpxZonesDelivery.chosenZoneId = 0;
            TwinpxZonesDelivery.chosenZoneTitle = '';
            TwinpxZonesDelivery.sendZoneId(true);
          }

          //set placemark on the map
          TwinpxZonesDelivery.deliveryPoint.geometry.setCoordinates(coords);
          TwinpxZonesDelivery.ymapsMap.setZoom(12);

          TwinpxZonesDelivery.highlightResult(
            TwinpxZonesDelivery.deliveryPoint
          );
        })
        .catch((error) => {
          console.log(error); // вывести ошибку
        });
    });
  };

  TwinpxZonesDelivery.btnDefault.addEventListener('click', (e) => {
    e.preventDefault();
    TwinpxZonesDelivery.sendZoneId();
  });

  TwinpxZonesDelivery.sendZoneId = async function (blurAddressControlFlag) {
    const formData = new FormData();
    formData.append('zid', TwinpxZonesDelivery.chosenZoneId);
    formData.append('coords', TwinpxZonesDelivery.chosenCoords);
    let response = await fetch(
      `/bitrix/services/main/ajax.php?mode=class&c=twinpx:zones.delivery&action=setZone`,
      {
        method: 'POST',
        body: formData,
      }
    );

    let result = await response.json();

    if (typeof result === 'object' && result.status === 'success') {
      TwinpxZonesDelivery.initAddressControl();
      if (TwinpxZonesDelivery.addressControl && !blurAddressControlFlag) {
        TwinpxZonesDelivery.addressControl.value =
          TwinpxZonesDelivery.chosenAddressWithCity;
      }
      TwinpxZonesDelivery.hideModal();
      window.BX.Sale.OrderAjaxComponent.sendRequest();
    } else if (typeof result === 'object' && result.status === 'error') {
      TwinpxZonesDelivery.chosenZoneId = 0;
      TwinpxZonesDelivery.chosenZoneTitle = '';
      TwinpxZonesDelivery.hideModal();
      window.BX.Sale.OrderAjaxComponent.sendRequest();
    }
  };

  TwinpxZonesDelivery.ymapsReady = function () {
    if (window.ymaps && window.ymaps.ready) {
      ymaps.ready(() => {
        if (!TwinpxZonesDelivery.centerMaps) {
          TwinpxZonesDelivery.showError(BX.message('TWINPX_JS_NO_REGION'));
          return;
        }

        //geo code
        const zdGeocoder = ymaps.geocode(TwinpxZonesDelivery.centerMaps, {
          results: 1,
        });

        zdGeocoder.then(async (res) => {
          // first result, its coords and bounds
          let firstGeoObject = res.geoObjects.get(0);
          firstGeoObjectCoords = firstGeoObject.geometry.getCoordinates();
          TwinpxZonesDelivery.regionBounds =
            firstGeoObject.properties.get('boundedBy');
          TwinpxZonesDelivery.chosenCoords = firstGeoObjectCoords;

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
                    TwinpxZonesDelivery.ymapsMap.balloon.close();
                  });
              },
            }
          );

          //set map
          TwinpxZonesDelivery.ymapsMap = new ymaps.Map(
            TwinpxZonesDelivery.ymap,
            {
              center: firstGeoObjectCoords,
              zoom: 9,
              controls: ['geolocationControl', 'searchControl', 'zoomControl'],
            },
            {
              suppressMapOpenBlock: true,
            }
          );

          TwinpxZonesDelivery.ymapsMap.events.add('click', function (e) {
            TwinpxZonesDelivery.highlightResult(e);
          });

          TwinpxZonesDelivery.deliveryPoint = new ymaps.GeoObject(
            {
              geometry: {
                type: 'Point',
                coordinates: TwinpxZonesDelivery.ymapsMap.getCenter(),
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

          TwinpxZonesDelivery.deliveryPoint.events.add('click', () => {
            TwinpxZonesDelivery.highlightResult(
              TwinpxZonesDelivery.deliveryPoint
            );
          });

          TwinpxZonesDelivery.ymapsMap.geoObjects.add(
            TwinpxZonesDelivery.deliveryPoint
          );

          //search placeholder
          let searchControl =
            TwinpxZonesDelivery.ymapsMap.controls.get('searchControl');
          searchControl.options.set({
            noPlacemark: true,
            placeholderContent: BX.message('TWINPX_JS_CONTROL_NAME'),
          });

          //get zones
          if (TwinpxZonesDelivery.polygons) {
            TwinpxZonesDelivery.deliveryZones = ymaps
              .geoQuery(TwinpxZonesDelivery.polygons)
              .addToMap(TwinpxZonesDelivery.ymapsMap);

            TwinpxZonesDelivery.deliveryZones.each((obj) => {
              obj.options.set({
                fillColor: obj.properties.get('fill'),
                fillOpacity: obj.properties.get('fill-opacity'),
                strokeColor: obj.properties.get('stroke'),
                strokeWidth: obj.properties.get('stroke-width'),
                strokeOpacity: obj.properties.get('stroke-opacity'),
              });
              TwinpxZonesDelivery.zoneOpacity =
                obj.properties.get('fill-opacity');
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
                TwinpxZonesDelivery.deliveryPoint.geometry.setCoordinates(
                  e.get('coords')
                );
                TwinpxZonesDelivery.highlightResult(
                  TwinpxZonesDelivery.deliveryPoint
                );
              });
            });

            //map bounds
            /*TwinpxZonesDelivery.polygonsBounds =
                TwinpxZonesDelivery.deliveryZones.getBounds();
              TwinpxZonesDelivery.ymapsMap.setBounds(
                TwinpxZonesDelivery.polygonsBounds,
                { checkZoomRange: true }
              );*/
            //bounds for the region
            /*TwinpxZonesDelivery.ymapsMap.setBounds(
                TwinpxZonesDelivery.regionBounds, //region
                {
                  checkZoomRange: true,
                }
              );*/

            // Проверим попадание результата поиска в одну из зон доставки.
            searchControl.events.add('resultshow', function (e) {
              TwinpxZonesDelivery.highlightResult(
                searchControl.getResultsArray()[e.get('index')]
              );
            });

            // Проверим попадание метки геолокации в одну из зон доставки.
            TwinpxZonesDelivery.ymapsMap.controls
              .get('geolocationControl')
              .events.add('locationchange', function (e) {
                TwinpxZonesDelivery.highlightResult(e.get('geoObjects').get(0));
              });

            TwinpxZonesDelivery.ymapsMap.events.add('click', (e) => {
              e.stopPropagation();
              TwinpxZonesDelivery.deliveryPoint.balloon.close();
            });

            // При перемещении метки сбрасываем подпись, содержимое балуна и перекрашиваем метку.
            TwinpxZonesDelivery.deliveryPoint.events.add(
              'dragstart',
              function () {
                TwinpxZonesDelivery.deliveryPoint.properties.set({
                  balloonContent: '',
                });
                TwinpxZonesDelivery.deliveryPoint.options.set(
                  'iconColor',
                  'gray'
                );
              }
            );

            // По окончании перемещения метки вызываем функцию выделения зоны доставки.
            TwinpxZonesDelivery.deliveryPoint.events.add(
              'dragend',
              function () {
                TwinpxZonesDelivery.highlightResult(
                  TwinpxZonesDelivery.deliveryPoint
                );
              }
            );
          } else {
            TwinpxZonesDelivery.showError('');
          }

          TwinpxZonesDelivery.highlightResult(
            TwinpxZonesDelivery.deliveryPoint
          );
        });
      });
    }
  };

  TwinpxZonesDelivery.highlightResult = function (obj) {
    // Сохраняем координаты переданного объекта.
    var coords = obj.geometry
        ? obj.geometry.getCoordinates()
        : obj.get('coords'), //в obj может быть событие click из TwinpxZonesDelivery.ymapsMap.events
      // Находим полигон, в который входят переданные координаты.
      polygon = TwinpxZonesDelivery.deliveryZones
        .searchContaining(coords)
        .get(0);

    TwinpxZonesDelivery.chosenCoords = coords;

    if (polygon) {
      // Уменьшаем прозрачность всех полигонов, кроме того, в который входят переданные координаты.
      TwinpxZonesDelivery.deliveryZones.setOptions(
        'fillOpacity',
        TwinpxZonesDelivery.zoneOpacity
      );
      polygon.options.set(
        'fillOpacity',
        1 * TwinpxZonesDelivery.zoneOpacity + 0.1
      );
      // Перемещаем метку с подписью в переданные координаты и перекрашиваем её в цвет полигона.
      TwinpxZonesDelivery.deliveryPoint.geometry.setCoordinates(coords);
      TwinpxZonesDelivery.deliveryPoint.options.set(
        'iconColor',
        polygon.properties.get('fill')
      );

      // Задаем подпись для метки.
      if (typeof obj.getThoroughfare === 'function') {
        //if search
        //remember zone id
        TwinpxZonesDelivery.chosenZoneId = polygon.properties.get('id');
        TwinpxZonesDelivery.chosenZoneTitle = polygon.properties.get('title');
        TwinpxZonesDelivery.chosenAddress = getAddress(obj);
        //balloon
        TwinpxZonesDelivery.deliveryPoint.properties.set({
          balloonContent: `
            <b>${polygon.properties.get('title')}</b>
            <br>${TwinpxZonesDelivery.chosenAddress}
          `,
        });
        TwinpxZonesDelivery.deliveryPoint.balloon.open();
      } else {
        // Если вы не хотите, чтобы при каждом перемещении метки отправлялся запрос к геокодеру,
        // закомментируйте код ниже.
        ymaps.geocode(coords, { results: 1 }).then(function (res) {
          //remember zone id
          TwinpxZonesDelivery.chosenZoneId = polygon.properties.get('id');
          TwinpxZonesDelivery.chosenZoneTitle = polygon.properties.get('title');
          //balloon
          var obj = res.geoObjects.get(0);

          TwinpxZonesDelivery.chosenAddress = getAddress(obj);

          TwinpxZonesDelivery.deliveryPoint.properties.set({
            balloonContent: `
              <b>${polygon.properties.get('title')}</b>
              <br>${TwinpxZonesDelivery.chosenAddress}
            `,
          });
          TwinpxZonesDelivery.deliveryPoint.balloon.open();
        });
      }

      //center the map
      TwinpxZonesDelivery.ymapsMap.panTo(coords);
      //Enable button
      TwinpxZonesDelivery.btnDefault.classList.remove(
        'twpx-zd-modal-btn--disabled'
      );
    } else {
      TwinpxZonesDelivery.chosenZoneId = 0;
      TwinpxZonesDelivery.chosenZoneTitle = '';
      // Если переданные координаты не попадают в полигон, то задаём стандартную прозрачность полигонов.
      TwinpxZonesDelivery.deliveryZones.setOptions(
        'fillOpacity',
        TwinpxZonesDelivery.zoneOpacity
      );
      // Перемещаем метку по переданным координатам.
      TwinpxZonesDelivery.deliveryPoint.geometry.setCoordinates(coords);
      // Задаём контент балуна и метки.
      TwinpxZonesDelivery.deliveryPoint.properties.set({
        balloonContent: BX.message('TWINPX_EMPTY_ZONE'),
      });
      setTimeout(() => {
        TwinpxZonesDelivery.deliveryPoint.balloon.open();
      }, 0);
      // Перекрашиваем метку в чёрный цвет.
      TwinpxZonesDelivery.deliveryPoint.options.set('iconColor', 'black');
      //Disable button
      TwinpxZonesDelivery.btnDefault.classList.add(
        'twpx-zd-modal-btn--disabled'
      );
    }

    function getAddress(obj) {
      /*var address = [
        obj.getThoroughfare(),
        obj.getPremiseNumber(),
        obj.getPremise(),
      ].join(' ');*/
      let address = obj.properties._data.name;
      TwinpxZonesDelivery.chosenAddressWithCity = obj.getAddressLine();
      if (address.trim() === '') {
        address = obj.getAddressLine();
      }
      return address;
    }
  };

  TwinpxZonesDelivery.ymapsReset = function () {
    //set polygon bounds
    if (TwinpxZonesDelivery.polygonsBounds) {
      TwinpxZonesDelivery.ymapsMap.setBounds(
        TwinpxZonesDelivery.polygonsBounds,
        { checkZoomRange: true }
      );
    }
    //get map center
    let centerCoords = TwinpxZonesDelivery.ymapsMap.getCenter();
    TwinpxZonesDelivery.chosenCoords = centerCoords;
    //placemark in the center
    TwinpxZonesDelivery.deliveryPoint.geometry.setCoordinates(centerCoords);
    //hide balloon
    TwinpxZonesDelivery.deliveryPoint.balloon.close();
    TwinpxZonesDelivery.deliveryPoint.options.set('iconColor', 'gray');
  };

  TwinpxZonesDelivery.findCheckbox = function () {
    document
      .querySelectorAll(`[name=${TwinpxZonesDelivery.addressInput.name}]`)
      .forEach((checkbox) => {
        if (checkbox.value === TwinpxZonesDelivery.addressInput.value) {
          TwinpxZonesDelivery.checkbox = checkbox;
        }
      });
  };

  TwinpxZonesDelivery.onBeforeSendRequest = function () {
    if (window.BX && BX.Event && BX.Event.EventEmitter) {
      BX.Event.EventEmitter.subscribe(
        'BX.Sale.OrderAjaxComponent:onBeforeSendRequest',
        (event) => {
          TwinpxZonesDelivery.findCheckbox();

          //if there is no zones delivery for some location
          if (
            !TwinpxZonesDelivery.checkbox ||
            !TwinpxZonesDelivery.checkbox.parentNode
          ) {
            return;
          }

          let emptySpan = document.createElement('span');
          emptySpan.id = `ZONES_DELIVERY_SPAN`;
          TwinpxZonesDelivery.checkbox.parentNode.appendChild(emptySpan);
          let counter = 0;
          //wait for the reload
          let intervalId = setInterval(() => {
            if (!document.getElementById(`ZONES_DELIVERY_SPAN`)) {
              clearInterval(intervalId);
              TwinpxZonesDelivery.initAddressControl();
              TwinpxZonesDelivery.getChosenZoneFromCookies();
              TwinpxZonesDelivery.showZoneTitle();
            } else if (++counter >= 100) {
              clearInterval(intervalId);
            }
          }, 200);
        }
      );
    }
  };

  TwinpxZonesDelivery.showZoneTitle = function () {
    if (
      !document.querySelector('#twpx-zd-showmodal') ||
      !TwinpxZonesDelivery.chosenZoneTitle
    )
      return;

    const div = document.createElement('div');
    div.id = 'twpx-zd-showmodal-zonename';
    div.style.display = 'block';
    div.style.paddingTop = '15px';
    div.textContent = TwinpxZonesDelivery.chosenZoneTitle;

    const title = document.createElement('div');
    title.style.color = '#8d8d8d';
    title.style.fontSize = '13px';
    title.style.lineHeight = '1.5';
    title.textContent = BX.message('TWINPX_JS_ZONE_TITLE');

    div.prepend(title);

    document.querySelector('#twpx-zd-showmodal').after(div);
  };

  TwinpxZonesDelivery.init = function () {
    TwinpxZonesDelivery.initAddressControl();
    TwinpxZonesDelivery.ymapsReady();
    TwinpxZonesDelivery.onBeforeSendRequest();
    TwinpxZonesDelivery.showZoneTitle();
  };

  //init
  TwinpxZonesDelivery.init();
});
