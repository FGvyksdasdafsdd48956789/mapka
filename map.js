// map.js — исправленные метки, которые не съезжают при зуме
;(async function initMap() {
  const ymaps3 = window.ymaps3
  if (!ymaps3) {
    console.error("ymaps3 is not available")
    return
  }

  try {
    await ymaps3.ready
  } catch (e) {
    console.error("ymaps3.ready failed", e)
    return
  }

  const { YMap, YMapDefaultSchemeLayer, YMapDefaultFeaturesLayer, YMapMarker } = ymaps3

  const rostovLocation = { center: [39.711515, 47.236171], zoom: 12 }

  const mapContainer = window.innerWidth >= 768 ? document.getElementById("map") : document.getElementById("mobileMap")

  if (!mapContainer) {
    console.error("Контейнер карты не найден")
    return
  }

  const map = new YMap(mapContainer, { location: rostovLocation })
  map.addChild(new YMapDefaultSchemeLayer())
  map.addChild(new YMapDefaultFeaturesLayer())

  const GEOCODE_API_KEY = "58c38b72-57f7-4946-bc13-a256d341281a"

  async function geocodeAddress(address) {
    if (!address) return null
    const url = `https://geocode-maps.yandex.ru/1.x/?format=json&geocode=${encodeURIComponent(address)}&apikey=${GEOCODE_API_KEY}&results=1`
    try {
      const r = await fetch(url)
      if (!r.ok) {
        console.warn("Geocode HTTP error", r.status)
        return null
      }
      const json = await r.json()
      const fm = json?.response?.GeoObjectCollection?.featureMember
      if (Array.isArray(fm) && fm.length) {
        const pos = fm[0].GeoObject?.Point?.pos
        if (pos) {
          const [lng, lat] = pos.split(" ").map(Number)
          if (!Number.isNaN(lng) && !Number.isNaN(lat)) return [lng, lat]
        }
      }
      return null
    } catch (err) {
      console.error("Fetch geocode failed", err)
      return null
    }
  }

  function normalizeAddress(str) {
    return (str || "")
      .replace(/^г\.\s*/i, "")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase()
  }

  function createMarkerElement(title = "", rawAddress = "") {
    const el = document.createElement("div")
    el.className = "custom-marker"
    // Центрируем метку относительно координат (снизу по центру точки)
    el.style.transform = "translate(-50%, -100%)"
    el.style.pointerEvents = "auto"
    el.style.cursor = "pointer"
    el.setAttribute("data-address", normalizeAddress(rawAddress))

    const wrapper = document.createElement("div")
    wrapper.style.display = "flex"
    wrapper.style.flexDirection = "column"
    wrapper.style.alignItems = "center"

    // Подпись
    const lbl = document.createElement("div")
    lbl.className = "custom-marker-label"
    lbl.textContent = title || rawAddress || ""
    lbl.style.fontSize = "12px"
    lbl.style.fontWeight = "500"
    lbl.style.color = "#111"
    lbl.style.background = "rgba(255,255,255,0.95)"
    lbl.style.padding = "4px 10px"
    lbl.style.borderRadius = "10px"
    lbl.style.boxShadow = "0 2px 6px rgba(0,0,0,0.15)"
    lbl.style.whiteSpace = "nowrap"
    lbl.style.marginBottom = "6px"
    lbl.style.pointerEvents = "none"

    // Точка
    const dot = document.createElement("div")
    dot.className = "custom-marker-dot"
    dot.style.width = "18px"
    dot.style.height = "18px"
    dot.style.borderRadius = "50%"
    dot.style.background = "#e74c3c"
    dot.style.boxShadow = "0 2px 6px rgba(0,0,0,0.35)"
    dot.style.border = "3px solid white"

    wrapper.appendChild(lbl)
    wrapper.appendChild(dot)
    el.appendChild(wrapper)

    return el
  }

  function addMarkerToMap(coords, title = "", rawAddress = "") {
    try {
      const markerElement = createMarkerElement(title, rawAddress)
      const marker = new YMapMarker({ coordinates: coords }, markerElement)
      map.addChild(marker)

      // Клик по метке -> скролл к карточке
      const elToMatch = markerElement.getAttribute("data-address")
      markerElement.addEventListener("click", () => {
        if (!elToMatch) return
        const all = Array.from(document.querySelectorAll(".cardLocationText"))
        const target = all.find((x) => normalizeAddress(x.textContent) === elToMatch)
        if (target) {
          target.closest(".sectionCard")?.scrollIntoView({ behavior: "smooth", block: "center" })
          const card = target.closest(".sectionCard")
          if (card) {
            card.classList.add("highlight-temp")
            setTimeout(() => card.classList.remove("highlight-temp"), 2000)
          }
        }
      })

      return marker
    } catch (err) {
      console.error("Ошибка при создании YMapMarker", err)
      return null
    }
  }

  const els = Array.from(document.querySelectorAll(".cardLocationText"))
  if (!els.length) {
    console.warn("Не найдено .cardLocationText")
    return
  }

  const added = []
  for (const el of els) {
    const raw = el.textContent.trim()
    const address = raw.replace(/^г\.\s*/i, "").trim()
    const title = el.closest(".sectionCard")?.querySelector("h2")?.textContent?.trim() || ""
    const coords = await geocodeAddress(address)
    if (coords) {
      addMarkerToMap(coords, title, address)
      added.push(coords)
    }
    await new Promise((r) => setTimeout(r, 200))
  }

  if (added.length) {
    try {
      if (typeof map.setLocation === "function") {
        map.setLocation({ center: added[0], zoom: 13 })
      }
    } catch (e) {
      console.warn("Не удалось центрировать карту", e)
    }
  }
})()
