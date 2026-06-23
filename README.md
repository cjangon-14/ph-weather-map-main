🌍 Philippines Weather & Hazard Map

A web-based geographic visualization tool that displays real-time weather conditions across cities and municipalities in the Philippines, along with hazard layers such as earthquakes and volcanic activity. Built with Leaflet, OpenWeatherMap, USGS, and NASA EONET.

🔗 Live Demo

➡ Live Site:
(https://cjangon14.github.io/ph-weather-map/)

📌 Features (Implemented)
Category	Description
Weather	Real-time weather markers from OpenWeatherMap using animated icons
Geographic Layers	Provincial boundary outlines via GADM PH Level-2
Hazards	Active volcano markers + hazard rings (NASA EONET)
Live earthquake feed (USGS)
UI / UX	Drawer UI for toggling layers, smooth transitions, and dynamic panel content
Search System	Autocomplete for cities, municipalities, and provinces
Performance Controls	Rate-limited sequential API calls to avoid exceeding OpenWeather limits
🗂 Data Sources
Dataset	Provider
Weather API	OpenWeatherMap
Earthquake Feed	USGS GeoJSON Feed
Volcano Activity	NASA EONET
Provincial Boundaries	GADM Level-2 Shapefiles
⚙️ Tech Stack

Leaflet (map rendering)

JavaScript (Vanilla)

HTML / CSS

OpenWeather API

USGS Realtime API

NASA EONET API

(Planned optional backend features may introduce Node.js or caching later.)

🚧 Planned Features (Upcoming)

These features are intended, but currently paused due to workload:

Tsunami hazard visualization (NOAA / PHIVOLCS)

Tropical cyclone tracking (JTWC / PAGASA overlays)

Flood hazard layers

Volcano info panel with historical data

Saved bookmarks / pinned locations

Historical weather charts per city

Offline map tile caching
