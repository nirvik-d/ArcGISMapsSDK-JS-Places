import "./style.css";

require([
  "esri/Map",
  "esri/views/MapView",
  "esri/rest/places",
  "esri/rest/support/FetchPlaceParameters",
  "esri/rest/support/PlacesQueryParameters",
  "esri/geometry/Circle",
  "esri/Graphic",
  "esri/layers/GraphicsLayer",
], (
  Map,
  MapView,
  places,
  FetchPlaceParameters,
  PlacesQueryParameters,
  Circle,
  Graphic,
  GraphicsLayer
) => {
  let infoPanel; // Info panel for place information
  let clickPoint; // Clicked point on the map
  let activeCategory = "4d4b7105d754a06377d81259"; // Landmarks and Outdoors category

  // GraphicsLayer for places features
  const placesLayer = new GraphicsLayer({
    id: "placesLayer",
  });
  // GraphicsLayer for map buffer
  const bufferLayer = new GraphicsLayer({
    id: "bufferLayer",
  });

  // Info panel interactions
  const categorySelect = document.getElementById("categorySelect");
  const resultPanel = document.getElementById("results");
  const flow = document.getElementById("flow");

  // Map with the GraphicsLayers
  const map = new Map({
    basemap: "arcgis/navigation",
    layers: [bufferLayer, placesLayer],
  });

  // View centered around Venice Beach, CA
  const view = new MapView({
    map: map,
    center: [-118.46651, 33.98621],
    zoom: 13,
    container: "viewDiv",
  });

  function clearGraphics() {
    placesLayer.removeAll();
    bufferLayer.removeAll();
    resultPanel.innerHTML = "";
    if (infoPanel) infoPanel.remove();
  }

  view.on("click", async (event) => {
    clearGraphics();
    clickPoint = {};
    clickPoint.type = "point";
    clickPoint.longitude = Math.round(event.mapPoint.longitude * 1000) / 1000;
    clickPoint.latitude = Math.round(event.mapPoint.latitude * 1000) / 1000;
    clickPoint && showPlaces(clickPoint);
    console.log(clickPoint);
  });

  categorySelect.addEventListener("calciteComboboxChange", async () => {
    activeCategory = categorySelect.value;
    clearGraphics();
    clickPoint && showPlaces(clickPoint);
  });

  async function showPlaces(clickPoint) {
    const circleGeometry = new Circle({
      center: clickPoint,
      geodesic: true,
      numberOfPoints: 100,
      radius: 500,
      radiusUnit: "meters",
    });
    const circleGraphic = new Graphic({
      geometry: circleGeometry,
      symbol: {
        type: "simple-fill",
        style: "solid",
        color: [3, 140, 255, 0.1],
        outline: {
          width: 1,
          color: [3, 140, 255],
        },
      },
    });
    bufferLayer.graphics.add(circleGraphic);

    const placesQueryParameters = new PlacesQueryParameters({
      categoryIds: [activeCategory],
      radius: 500,
      point: clickPoint,
      icon: "png",
    });
    const results = await places.queryPlacesNearPoint(placesQueryParameters);
    tabulateResults(results);
  }

  async function tabulateResults(results) {
    results.results.forEach((placeResult) => {
      addResult(placeResult);
    });
  }

  async function addResult(placeResult) {
    const placeGraphic = new Graphic({
      geometry: placeResult.location,
      symbol: {
        type: "picture-marker",
        url: placeResult.icon.url,
        width: 15,
        height: 15,
      },
    });
    placesLayer.graphics.add(placeGraphic);

    const infoDiv = document.createElement("calcite-list-item");
    infoDiv.label = placeResult.name;
    infoDiv.description = `${placeResult.categories[0].label} - ${Number(
      (placeResult.distance / 1000).toFixed(1)
    )} km`;
    infoDiv.addEventListener("click", async () => {
      view.openPopup({
        title: placeResult.name,
        location: placeResult.location,
      });
      view.goTo(placeGraphic);

      const fetchPlaceParameters = new FetchPlaceParameters({
        placeId: placeResult.placeId,
        requestedFields: ["all"],
      });
      getDetails(fetchPlaceParameters, placeResult.location);
    });

    resultPanel.appendChild(infoDiv);

    async function getDetails(fetchPlaceParameters, location) {
      const result = await places.fetchPlace(fetchPlaceParameters);
      const placeDetails = result.placeDetails;

      infoPanel = document.createElement("calcite-list-item");
      flow.append(infoPanel);
      infoPanel.heading = placeDetails.name;
      infoPanel.description = placeDetails.categories[0].label;

      const flowItems = flow.querySelectorAll("calcite-flow-item");
      flowItems.forEach((item) => (item.selected = false));

      infoPanel.selected = true;

      setAttribute("Address", "map-pin", placeDetails.address.streetAddress);
      setAttribute("Phone", "mobile", placeDetails.contactInfo.telephone);
      setAttribute("Email", "email-address", placeDetails.contactInfo.email);
      setAttribute(
        "Facebook",
        "speech-bubble-social",
        placeDetails.socialMedia.facebookId
          ? `www.facebook.com/${placeDetails.socialMedia.facebookId}`
          : null
      );
      setAttribute(
        "X",
        "speech-bubbles",
        placeDetails.socialMedia.twitter
          ? `www.x.com/${placeDetails.socialMedia.twitter}`
          : null
      );
      setAttribute(
        "Instagram",
        "camera",
        placeDetails > socialMedia.instagram
          ? `www.instagram.com/${placeDetails.socialMedia.instagram}`
          : null
      );

      infoPanel.addEventListener("calciteFlowItemBack", () => {
        view.closePopup();
        infoPanel.remove();
      });
    }

    async function setAttribute(heading, icon, validValue) {
      if (validValue) {
        const element = document.createElement("calcite-block");
        element.heading = heading;
        element.description = validValue;

        const attributeIcon = document.createElement("calcite-icon");
        attributeIcon.icon = icon;
        attributeIcon.slot = "icon";
        attributeIcon.scale = "m";
        element.appendChild(attributeIcon);

        infoPanel.appendChild(element);
      }
    }
  }
});
