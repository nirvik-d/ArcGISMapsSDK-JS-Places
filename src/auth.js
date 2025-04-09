require(["esri/config"], (esriConfig) => {
  esriConfig.apiKey = import.meta.env.VITE_ARCGIS_API_KEY;
});
