window.addEventListener('DOMContentLoaded', () => {
  window.twpxZdAdm = {
    root: document.getElementById('twpxZdRoot'),
    tabs: document.getElementById('twpxZdTabs'),
    idHidden: document.getElementById('twpxZdIdHidden'),
    addForm: document.getElementById('twpxZdAddForm'),
    geojsonFileInput: document.getElementById('twpxZdGeojsonFileInput'),
    geojsonModal: document.getElementById('twpxZdGeojsonModal'),
    geojsonYmap: undefined,
    geojsonChosenProperties: undefined,
    geojsonStorage: {},
    addFormError: document.getElementById('twpxZdAddFormError'),
    settingsForm: document.getElementById('twpxZdSettingsForm'),
    settingsFormError: document.getElementById('twpxZdSettingsFormError'),
    list: document.getElementById('twpxZdList'),
    addPolygonBtn: document.getElementById('twpxZdAddPolygonBtn'),
    zonesTab: document.getElementById('twpxZdZonesTab'),
    ymapMap: undefined,
    fetchTimeout: 20000,
    typeDeliverySelect: document.getElementById('twpxZdType'),

    onLoad() {
      twpxZdAdm.init();
    },
    init() {
      //map
      twpxZdAdm.ymapLoad();
      //tabs
      twpxZdAdm.initTabs();
      //edit polygon icon
      twpxZdAdm.initEditIcon();
      //activity switcher
      twpxZdAdm.initActivitySwitcher();
      //add polygon button
      twpxZdAdm.addPolygonBtn.addEventListener('click', () => {
        twpxZdAdm.swithZonesMode('form');
      });
      //geojson modal events
      twpxZdAdm.geojsonModalEvents();
      //input label
      twpxZdAdm.initInputs();
      //select
      twpxZdAdm.initSelect();
      //add form
      twpxZdAdm.initAddForm();
      //settings form
      twpxZdAdm.initSettingsForm();
    },
    initTabs() {
      //tabs
      twpxZdAdm.tabs
        .querySelectorAll('.twpx-zd-adm-tabs__item')
        .forEach((tabItem) => {
          tabItem.addEventListener('click', (e) => {
            e.preventDefault();
            //remove class
            twpxZdAdm.tabs
              .querySelectorAll('.twpx-zd-adm-tabs__item')
              .forEach((item) => {
                item.classList.remove('twpx-zd-adm-tabs__item--active');
              });
            //add class
            tabItem.classList.add('twpx-zd-adm-tabs__item--active');

            //hide tabs
            twpxZdAdm.root
              .querySelectorAll('.twpx-zd-adm__tab')
              .forEach((tab) => {
                tab.classList.remove('twpx-zd-adm__tab--active');
              });

            //show tab
            twpxZdAdm.root
              .querySelector(
                `.twpx-zd-adm__tab[data-tab=${tabItem.getAttribute(
                  'data-tab'
                )}]`
              )
              .classList.add('twpx-zd-adm__tab--active');

            //set list mode
            if (tabItem.getAttribute('data-tab') === 'zones') {
              twpxZdAdm.swithZonesMode('list');
            }

            //fetch polygons and reload map
            if (tabItem.getAttribute('data-tab') === 'map') {
              twpxZdAdm.ymapLoad();
            }
          });
        });
    },
    initEditIcon() {
      twpxZdAdm.list.addEventListener('click', (e) => {
        if (
          e.target.tagName.toLowerCase() === 'img' &&
          e.target.parentNode.className === 'twpx-zd-adm__list__edit'
        ) {
          twpxZdAdm.swithZonesMode('form');
          twpxZdAdm.fillEditForm(
            e.target.closest('.twpx-zd-adm__list-item').getAttribute('data-id')
          );
        }
      });
    },
    initActivitySwitcher() {
      twpxZdAdm.list.addEventListener('click', async (e) => {
        if (!e.target.classList.contains('twpx-zd-adm__switcher')) {
          return;
        }
        e.target.classList.toggle('twpx-zd-adm__switcher--switched');

        //send
        //get zones json
        let formData = new FormData(),
          controller = new AbortController(),
          response,
          result;

        formData.set(
          'id',
          e.target.closest('.twpx-zd-adm__list-item').getAttribute('data-id')
        );
        formData.set(
          'activity',
          !e.target.classList.contains('twpx-zd-adm__switcher--switched')
        );

        setTimeout(() => {
          if (!response) {
            controller.abort();
          }
        }, twpxZdAdm.fetchTimeout);
        try {
          response = await fetch(TwinpxZonesDelivery.activityUrl, {
            body: formData,
            method: 'POST',
            signal: controller.signal,
          });

          result = await response.json();
        } catch (err) {
          throw err;
        }
      });
    },
    initInputs() {
      //label
      twpxZdAdm.root
        .querySelectorAll('.twpx-zd-adm__control')
        .forEach((block) => {
          let control = block.querySelector('.twpx-zd-adm__input');
          control = control ? control : block.querySelector('textarea');
          if (control.value.trim() !== '') {
            block.classList.add('twpx-zd-adm__control--active');
          }

          control.addEventListener('focus', () => {
            block.classList.add('twpx-zd-adm__control--active');
          });

          control.addEventListener('blur', () => {
            if (control.value.trim() !== '') {
              block.classList.add('twpx-zd-adm__control--active');
            } else {
              block.classList.remove('twpx-zd-adm__control--active');
            }
          });
        });

      //keyup
      twpxZdAdm.root
        .querySelectorAll('.twpx-zd-adm__input, textarea')
        .forEach((control) => {
          control.addEventListener('keyup', () => {
            if (control.value.trim() !== '') {
              control
                .closest('.twpx-zd-adm__control')
                .classList.remove('twpx-zd-adm__control--invalid');
            }
          });
        });
    },
    initSelect() {
      window.twpxZdAdm.selectControlSet(window.twpxZdAdm.typeDeliverySelect);

      window.twpxZdAdm.typeDeliverySelect.addEventListener('change', (e) => {
        window.twpxZdAdm.selectControlSet(e.target);
      });
    },
    selectControlSet(select) {
      select
        .closest('form')
        .querySelectorAll('.twpx-zd-adm__control-set')
        .forEach((set) => {
          if (set.getAttribute('data-type') === select.value) {
            set.classList.add('twpx-zd-adm__control-set--acitve');
          } else {
            set.classList.remove('twpx-zd-adm__control-set--acitve');
          }
        });
    },
    initAddForm() {
      //add geojson button
      twpxZdAdm.geojsonFileInput.addEventListener('change', () => {
        const file = twpxZdAdm.geojsonFileInput.files[0];

        if (file && file.name && !file.name.endsWith('geojson')) {
          alert('File is not a geojson.', file.name, file);
          return;
        }

        const reader = new FileReader();
        reader.addEventListener('load', () => {
          twpxZdAdm.showModal(JSON.parse(reader.result).features);
          twpxZdAdm.geojsonFileInput.value = '';
        });
        reader.readAsText(file);
      });
      //add form submit button
      twpxZdAdm.addForm
        .querySelector('.twpx-zd-adm__buttons .twpx-zd-amd-btn--save')
        .addEventListener('click', (e) => {
          twpxZdAdm.formSubmit(e, twpxZdAdm.addForm, twpxZdAdm.addFormSubmit);
        });
      //add form delete button
      twpxZdAdm.addForm
        .querySelector('.twpx-zd-amd-btn--delete')
        .addEventListener('click', twpxZdAdm.addFormDelete);
      //submit add form
      twpxZdAdm.addForm.addEventListener('submit', (e) => {
        twpxZdAdm.formSubmit(e, twpxZdAdm.addForm, twpxZdAdm.addFormSubmit);
      });
    },

    showModal(polygons) {
      twpxZdAdm.geojsonModal.classList.add('twpx-zd-modal--show');
      twpxZdAdm.geojsonModal.classList.add('twpx-zd-modal--z');
      twpxZdAdm.ymapGeojson(polygons);
    },
    hideModal() {
      twpxZdAdm.geojsonModal.classList.remove('twpx-zd-modal--show');

      setTimeout(() => {
        twpxZdAdm.geojsonModal.classList.remove('twpx-zd-modal--z');
      }, 500);

      twpxZdAdm.geojsonStorage = {};
      delete twpxZdAdm.geojsonChosenProperties;
    },
    ymapGeojson(polygons) {
      //create id
      polygons.forEach((p) => {
        p.properties.id = Math.round(Math.random() * 10000);
        p.geometry.coordinates[0].map((arr) => {
          arr.reverse();
        });
      });

      if (twpxZdAdm.geojsonYmap) {
        twpxZdAdm.geojsonYmap.destroy();
        twpxZdAdm.geojsonYmap = undefined;
      }

      //set map
      twpxZdAdm.geojsonYmap = new ymaps.Map(
        document.getElementById('TwpxZdGeojsonYmap'),
        {
          center: [0, 0],
          zoom: 9,
          controls: [],
        },
        {
          suppressMapOpenBlock: true,
        }
      );

      let deliveryZones = ymaps
        .geoQuery(
          ymaps.geoQuery({
            type: 'FeatureCollection',
            features: polygons,
          })
        )
        .addToMap(twpxZdAdm.geojsonYmap);

      //create storage for polygons
      polygons.forEach((p) => {
        twpxZdAdm.geojsonStorage[p.properties.id] = { polygon: p };
      });

      deliveryZones.each((obj) => {
        obj.options.set({
          fillColor: obj.properties.get('fill'),
          fillOpacity: obj.properties.get('fill-opacity'),
          strokeColor: obj.properties.get('stroke'),
          strokeWidth: obj.properties.get('stroke-width'),
          strokeOpacity: obj.properties.get('stroke-opacity'),
        });

        obj.events.add('mouseenter', () => {
          obj.options.set({
            fillOpacity: 0.5,
          });
        });

        obj.events.add('mouseleave', () => {
          let opacity = 0.6;
          const id = obj.properties.get('id');
          const st = twpxZdAdm.geojsonStorage[id];

          if (!st) return;

          if (st.checked) {
            opacity = 1;
          }

          obj.options.set({
            fillOpacity: opacity,
          });
        });

        obj.events.add('click', (e) => {
          e.stopPropagation();

          const id = obj.properties.get('id');
          const st = twpxZdAdm.geojsonStorage[id];
          const chosenLength = Object.values(twpxZdAdm.geojsonStorage).filter(
            (v) => v.checked
          ).length;

          if (!st) return;

          if (!st.checked) {
            st.checked = true;

            if (!chosenLength) {
              twpxZdAdm.geojsonChosenProperties = st.polygon.properties;
              obj.options.set({
                fillOpacity: 1,
              });
            } else if (twpxZdAdm.geojsonChosenProperties) {
              const p = twpxZdAdm.geojsonChosenProperties;
              obj.options.set({
                fillColor: p.fill,
                fillOpacity: 1,
                strokeColor: p.stroke,
                strokeWidth: p['stroke-width'],
                strokeOpacity: p['stroke-opacity'],
              });
            }
          } else {
            delete st.checked;

            if (chosenLength === 1) {
              twpxZdAdm.geojsonChosenProperties = undefined;
            } else {
              const p = st.polygon.properties;
              obj.options.set({
                fillColor: p.fill,
                fillOpacity: 0.6,
                strokeColor: p.stroke,
                strokeWidth: p['stroke-width'],
                strokeOpacity: p['stroke-opacity'],
              });
            }
          }
        });
      });

      //map bounds
      twpxZdAdm.polygonsBounds = deliveryZones.getBounds();
      twpxZdAdm.geojsonYmap.setBounds(twpxZdAdm.polygonsBounds, {
        checkZoomRange: true,
      });
    },
    geojsonModalEvents() {
      //save button
      twpxZdAdm.geojsonModal
        .querySelector('.twpx-zd-amd-btn--save')
        .addEventListener('click', (e) => {
          e.preventDefault();

          const polygonInput =
            twpxZdAdm.addForm.querySelector('#twpxZdPolygons');
          const propsInput = twpxZdAdm.addForm.querySelector('#twpxZdProps');

          const polygonInputValue = Object.values(twpxZdAdm.geojsonStorage)
            .filter((v) => v.checked)
            .map((v) =>
              v.polygon.geometry.coordinates[0].map((c) => c.reverse())
            );

          if (polygonInputValue && polygonInputValue.length) {
            polygonInput.value = JSON.stringify(
              Object.values(twpxZdAdm.geojsonStorage)
                .filter((v) => v.checked)
                .map((v) => v.polygon.geometry.coordinates[0])
            );
            polygonInput.focus();
          }

          if (twpxZdAdm.geojsonChosenProperties) {
            delete twpxZdAdm.geojsonChosenProperties.id;

            propsInput.value = JSON.stringify(
              twpxZdAdm.geojsonChosenProperties
            );
            propsInput.focus();
          }
          twpxZdAdm.hideModal();
        });
      //close button
      twpxZdAdm.geojsonModal
        .querySelector('.twpx-zd-amd-btn--close')
        .addEventListener('click', (e) => {
          e.preventDefault();
          twpxZdAdm.hideModal();
        });
      //close
      twpxZdAdm.geojsonModal
        .querySelector('.twpx-zd-modal-close')
        .addEventListener('click', (e) => {
          e.preventDefault();
          twpxZdAdm.hideModal();
        });
      //opaco
      twpxZdAdm.geojsonModal
        .querySelector('.twpx-zd-modal-body')
        .addEventListener('click', (e) => {
          e.stopPropagation();
        });

      twpxZdAdm.geojsonModal.addEventListener('click', (e) => {
        e.preventDefault();
        twpxZdAdm.hideModal();
      });
    },
    initSettingsForm() {
      //settings form submit button
      twpxZdAdm.settingsForm
        .querySelector('.twpx-zd-amd-btn--save')
        .addEventListener('click', (e) => {
          twpxZdAdm.settingsForm.submit();
        });
    },
    ymapLoad() {
      if (twpxZdAdm.ymapMap) {
        twpxZdAdm.ymapMap.destroy();
        twpxZdAdm.ymapMap = undefined;
      }
      TwinpxZonesDelivery.regionName =
        TwinpxZonesDelivery.regionName || 'Москва';

      if (window.ymaps && window.ymaps.ready) {
        ymaps.ready(() => {
          if (!TwinpxZonesDelivery.regionName) {
            TwinpxZonesDelivery.showError(BX.message('TWINPX_JS_NO_REGION'));
            return;
          }

          //geo code
          const zdGeocoder = ymaps.geocode(TwinpxZonesDelivery.regionName, {
            results: 1,
          });

          zdGeocoder.then(async (res) => {
            // first result, its coords and bounds
            let firstGeoObject = res.geoObjects.get(0);
            firstGeoObjectCoords = firstGeoObject.geometry.getCoordinates();
            bounds = firstGeoObject.properties.get('boundedBy');

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
                    .querySelector('#twpxZdYmap .twpx-zd-balloon-close')
                    .addEventListener('click', (e) => {
                      e.preventDefault();
                      twpxZdAdm.ymapMap.balloon.close();
                    });
                },
              }
            );

            //set map
            twpxZdAdm.ymapMap = new ymaps.Map(
              document.getElementById('twpxZdYmap'),
              {
                center: firstGeoObjectCoords,
                zoom: 9,
                controls: ['geolocationControl', 'searchControl'],
              },
              {
                suppressMapOpenBlock: true,
              }
            );

            let deliveryPoint = new ymaps.GeoObject(
              {
                geometry: {
                  type: 'Point',
                  coordinates: twpxZdAdm.ymapMap.getCenter(),
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

            deliveryPoint.events.add('click', () => {
              highlightResult(deliveryPoint);
            });

            twpxZdAdm.ymapMap.geoObjects.add(deliveryPoint);

            //search placeholder
            let searchControl = twpxZdAdm.ymapMap.controls.get('searchControl');
            searchControl.options.set({
              noPlacemark: true,
              placeholderContent: BX.message('TWINPX_JS_ENTER_ADDRESS'),
            });

            //get zones json
            let controller = new AbortController(),
              response,
              result;

            setTimeout(() => {
              if (!response) {
                controller.abort();
              }
            }, twpxZdAdm.fetchTimeout);

            document.getElementById('twpxZdYmap').classList.add('load-circle');

            try {
              response = await fetch(TwinpxZonesDelivery.geozonesUrl, {
                method: 'POST',
                signal: controller.signal,
              });

              result = await response.json();

              if (
                typeof result === 'object' &&
                result.status === 'success' &&
                result.data
              ) {
                result.data.features.sort(
                  (a, b) => Number(b['z-index']) - Number(a['z-index'])
                );

                document
                  .getElementById('twpxZdYmap')
                  .classList.remove('load-circle');

                let deliveryZones = ymaps
                  .geoQuery(result.data)
                  .addToMap(twpxZdAdm.ymapMap);

                deliveryZones.each((obj) => {
                  obj.options.set({
                    fillColor: obj.properties.get('fill'),
                    fillOpacity: obj.properties.get('fill-opacity'),
                    strokeColor: obj.properties.get('stroke'),
                    strokeWidth: obj.properties.get('stroke-width'),
                    strokeOpacity: obj.properties.get('stroke-opacity'),
                  });

                  obj.events.add('click', (e) => {
                    e.stopPropagation();
                    deliveryPoint.geometry.setCoordinates(e.get('coords'));
                    highlightResult(deliveryPoint);
                  });
                });

                //map bounds
                twpxZdAdm.polygonsBounds = deliveryZones.getBounds();
                twpxZdAdm.ymapMap.setBounds(twpxZdAdm.polygonsBounds, {
                  checkZoomRange: true,
                });

                // Проверим попадание результата поиска в одну из зон доставки.
                searchControl.events.add('resultshow', function (e) {
                  highlightResult(
                    searchControl.getResultsArray()[e.get('index')]
                  );
                });

                // Проверим попадание метки геолокации в одну из зон доставки.
                twpxZdAdm.ymapMap.controls
                  .get('geolocationControl')
                  .events.add('locationchange', function (e) {
                    highlightResult(e.get('geoObjects').get(0));
                  });

                twpxZdAdm.ymapMap.events.add('click', (e) => {
                  e.stopPropagation();
                  deliveryPoint.balloon.close();
                });

                // При перемещении метки сбрасываем подпись, содержимое балуна и перекрашиваем метку.
                deliveryPoint.events.add('dragstart', function () {
                  deliveryPoint.properties.set({
                    balloonContent: '',
                  });
                  deliveryPoint.options.set('iconColor', 'gray');
                });

                // По окончании перемещения метки вызываем функцию выделения зоны доставки.
                deliveryPoint.events.add('dragend', function () {
                  highlightResult(deliveryPoint);
                });

                function highlightResult(obj) {
                  // Сохраняем координаты переданного объекта.
                  var coords = obj.geometry.getCoordinates(),
                    // Находим полигон, в который входят переданные координаты.
                    polygon = deliveryZones.searchContaining(coords).get(0);

                  if (polygon) {
                    // Уменьшаем прозрачность всех полигонов, кроме того, в который входят переданные координаты.
                    deliveryZones.setOptions('fillOpacity', 0.4);
                    polygon.options.set('fillOpacity', 0.8);
                    // Перемещаем метку с подписью в переданные координаты и перекрашиваем её в цвет полигона.
                    deliveryPoint.geometry.setCoordinates(coords);
                    deliveryPoint.options.set(
                      'iconColor',
                      polygon.properties.get('fill')
                    );

                    // Задаем подпись для метки.
                    if (typeof obj.getThoroughfare === 'function') {
                      //if search
                      deliveryPoint.properties.set({
                        balloonContent: `
                        <b>${polygon.properties.get('title')}</b>
                        <br>${getAddress(obj)}
                      `,
                      });
                      deliveryPoint.balloon.open();
                    } else {
                      // Если вы не хотите, чтобы при каждом перемещении метки отправлялся запрос к геокодеру,
                      // закомментируйте код ниже.
                      ymaps
                        .geocode(coords, { results: 1 })
                        .then(function (res) {
                          var obj = res.geoObjects.get(0);

                          deliveryPoint.properties.set({
                            balloonContent: `
                          <b>${polygon.properties.get('title')}</b>
                          <br>${getAddress(obj)}
                        `,
                          });
                          deliveryPoint.balloon.open();
                        });
                    }

                    //center the map
                    twpxZdAdm.ymapMap.panTo(coords);
                  } else {
                    // Если переданные координаты не попадают в полигон, то задаём стандартную прозрачность полигонов.
                    deliveryZones.setOptions('fillOpacity', 0.4);
                    // Перемещаем метку по переданным координатам.
                    deliveryPoint.geometry.setCoordinates(coords);
                    // Задаём контент балуна и метки.
                    deliveryPoint.properties.set({
                      balloonContent: BX.message('TWINPX_JS_CALL'),
                    });
                    // Перекрашиваем метку в чёрный цвет.
                    deliveryPoint.options.set('iconColor', 'black');
                  }

                  function getAddress(obj) {
                    var address = [
                      obj.getThoroughfare(),
                      obj.getPremiseNumber(),
                      obj.getPremise(),
                    ].join(' ');
                    if (address.trim() === '') {
                      address = obj.getAddressLine();
                    }
                    return address;
                  }
                }
              }
            } catch (err) {}
          });
        });
      }
    },
    swithZonesMode(mode) {
      twpxZdAdm.zonesTab
        .querySelectorAll('.twpx-zd-adm__mode')
        .forEach((modeElement) => {
          modeElement.classList.remove('twpx-zd-adm__mode--active');
        });

      twpxZdAdm.zonesTab
        .querySelector(`[data-mode=${mode}]`)
        .classList.add('twpx-zd-adm__mode--active');

      //set tab clickable
      if (mode === 'form') {
        twpxZdAdm.addFormClean();
        twpxZdAdm.root
          .querySelector(`.twpx-zd-adm-tabs__item[data-tab='zones']`)
          .classList.remove('twpx-zd-adm-tabs__item--active');
      } else {
        twpxZdAdm.root
          .querySelector(`.twpx-zd-adm-tabs__item[data-tab='zones']`)
          .classList.add('twpx-zd-adm-tabs__item--active');
      }
    },
    addFormClean() {
      twpxZdAdm.addForm
        .querySelectorAll('.twpx-zd-adm__input, textarea')
        .forEach((control) => {
          control.value = '';
          control.parentNode.classList.remove('twpx-zd-adm__control--active');
          control.parentNode.classList.remove('twpx-zd-adm__control--invalid');
        });

      twpxZdAdm.idHidden.value = '';
    },
    formSubmit(e, form, callback) {
      e.preventDefault();

      //validate the form
      let focusElement = twpxZdAdm.formValidation(form);

      //focus
      if (!focusElement) {
        callback();
      }
    },
    formValidation(formElem) {
      let focusElement;

      //required
      formElem
        .querySelectorAll('.twpx-zd-adm__input, textarea')
        .forEach((reqInput) => {
          if (reqInput.closest('.twpx-zd-adm__control-set')) {
            if (
              reqInput.closest('.twpx-zd-adm__control-set') &&
              reqInput.closest('.twpx-zd-adm__control-set--acitve')
            ) {
              validateControl(reqInput);
            }
          } else {
            validateControl(reqInput);
          }
        });

      function validateControl(reqInput) {
        if (reqInput.value.trim() === '') {
          if (!focusElement) {
            focusElement = reqInput;
          }
          reqInput
            .closest('.twpx-zd-adm__control')
            .classList.add('twpx-zd-adm__control--invalid');
        } else {
          reqInput
            .closest('.twpx-zd-adm__control')
            .classList.remove('twpx-zd-adm__control--invalid');
        }
      }

      if (focusElement) {
        focusElement.dispatchEvent(new Event('focus'));
      }

      return focusElement;
    },
    JSONFormData(formData) {
      const obj = {};
      for (let key of formData.keys()) {
        obj[key] = formData.get(key);
      }
      return JSON.stringify(obj);
    },
    async addFormSubmit() {
      twpxZdAdm.addForm.classList.add('load-circle');

      let jsonStringify = twpxZdAdm.JSONFormData(
        new FormData(twpxZdAdm.addForm)
      );
      let formData = new FormData();
      formData.set('json', jsonStringify);

      let response = await fetch(twpxZdAdm.addForm.getAttribute('action'), {
        method: twpxZdAdm.addForm.getAttribute('method'),
        body: formData,
      });
      let result = await response.json();

      if (
        typeof result === 'object' &&
        result.status === 'success' &&
        result.data
      ) {
        twpxZdAdm.addForm.classList.remove('load-circle');
        //clear error
        twpxZdAdm.addFormError.innerHTML = '';
        //add new
        let newItem = document.createElement('div');
        newItem.className =
          'twpx-zd-adm__list-item twpx-zd-adm__list-item--new';
        newItem.setAttribute('data-id', result.data.id);
        newItem.innerHTML = `
          <div class="twpx-zd-adm__list__name">
            ${
              result.data.name
                ? '<div class="twpx-zd-adm__list__heading">' +
                  BX.message('TWINPX_JS_CONTROL_NAME') +
                  '</div>' +
                  result.data.name
                : ''
            }
          </div>
          <div class="twpx-zd-adm__list__code">
            ${
              result.data.code
                ? '<div class="twpx-zd-adm__list__heading">' +
                  BX.message('TWINPX_JS_CONTROL_ID') +
                  '</div>' +
                  result.data.code
                : ''
            }
          </div>
          <div class="twpx-zd-adm__list__price">
            ${
              result.data.price
                ? '<div class="twpx-zd-adm__list__heading">' +
                  BX.message(
                    'TWINPX_JS_CONTROL_PRICE_' +
                      window.twpxZdAdm.typeDeliverySelect.value
                  ) +
                  '</div>' +
                  result.data.price
                : ''
            }
          </div>
          <div class="twpx-zd-adm__list__add">
            ${
              result.data.add
                ? '<div class="twpx-zd-adm__list__heading">' +
                  BX.message(
                    'TWINPX_JS_CONTROL_ADD_' +
                      window.twpxZdAdm.typeDeliverySelect.value
                  ) +
                  '</div>' +
                  result.data.add
                : ''
            }
          </div>
          <div class="twpx-zd-adm__list__max">
            ${
              result.data.max
                ? '<div class="twpx-zd-adm__list__heading">' +
                  BX.message(
                    'TWINPX_JS_CONTROL_MAX_' +
                      window.twpxZdAdm.typeDeliverySelect.value
                  ) +
                  '</div>' +
                  result.data.max
                : ''
            }
          </div>
          <div class="twpx-zd-adm__list__activity">
            <div class="twpx-zd-adm__switcher"></div>
          </div>
          <div class="twpx-zd-adm__list__edit">
            <img src="${
              window.TwinpxZonesDelivery.imagePath
            }twpx-zd-icon-settings.svg" alt="">
          </div>
          `;

        let oldItem = twpxZdAdm.list.querySelector(
          `[data-id="${result.data.id}"]`
        );
        if (oldItem) {
          oldItem.remove();
        }

        twpxZdAdm.list.prepend(newItem);

        twpxZdAdm.newItemAnimation(newItem);

        twpxZdAdm.swithZonesMode('list');
      } else if (result.ERROR) {
        twpxZdAdm.addForm.classList.remove('load-circle');
        twpxZdAdm.addFormError.innerHTML = result.ERROR;
      }
    },
    async addFormDelete(e) {
      e.preventDefault();

      if (twpxZdAdm.idHidden.value) {
        twpxZdAdm.addForm.classList.add('load-circle');

        let jsonStringify = twpxZdAdm.JSONFormData(
          new FormData(twpxZdAdm.addForm)
        );
        let formData = new FormData();
        formData.set('json', jsonStringify);

        let response = await fetch(
          twpxZdAdm.addForm.getAttribute('data-delete-action'),
          {
            method: twpxZdAdm.addForm.getAttribute('method'),
            body: formData,
          }
        );
        let result = await response.json();

        if (
          typeof result === 'object' &&
          result.status === 'success' &&
          result.data
        ) {
          twpxZdAdm.addForm.classList.remove('load-circle');

          //clear error
          twpxZdAdm.addFormError.innerHTML = '';

          twpxZdAdm.swithZonesMode('list');

          let removedItem = twpxZdAdm.list.querySelector(
            `[data-id="${result.data.id}"]`
          );

          if (removedItem) {
            removedItem.classList.add('twpx-zd-adm__list-item--removed');
            twpxZdAdm.removedItemAnimation(removedItem);
          }
        }
      } else {
        twpxZdAdm.swithZonesMode('list');
      }
    },
    async fillEditForm(id) {
      twpxZdAdm.addForm.classList.add('load-circle');

      const editData = new FormData();
      editData.append('id', id);
      let response = await fetch(
        twpxZdAdm.addForm.getAttribute('data-fill-action'),
        {
          method: 'POST',
          body: editData,
        }
      );
      let result = await response.json();

      if (
        typeof result === 'object' &&
        result.status === 'success' &&
        result.data
      ) {
        twpxZdAdm.addForm.classList.remove('load-circle');

        Array.from(twpxZdAdm.addForm.elements).forEach((control) => {
          let value = result.data[control.getAttribute('name')];
          if (value) {
            control.value = value;
            if (control.closest('.twpx-zd-adm__control')) {
              control
                .closest('.twpx-zd-adm__control')
                .classList.add('twpx-zd-adm__control--active');
            }
          }
        });

        window.twpxZdAdm.selectControlSet(
          twpxZdAdm.addForm.querySelector('select')
        );
      }
    },
    newItemAnimation(newItem) {
      setTimeout(() => {
        newItem.classList.remove('twpx-zd-adm__list-item--new');
      }, 100);
    },
    removedItemAnimation(removedItem) {
      removedItem.style.height = removedItem.clientHeight + 'px';
      removedItem.style.minHeight = '0px';
      setTimeout(() => {
        removedItem.style.height = '0px';
        removedItem.style.paddingTop = '0px';
        removedItem.style.paddingBottom = '0px';
        removedItem.style.marginBottom = '0px';
      }, 100);
    },
  };

  twpxZdAdm.onLoad();
});
