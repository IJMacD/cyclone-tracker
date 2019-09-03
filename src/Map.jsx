import React from 'react';
import useDimensions from './use-dimensions';

// COORDS of HKO
const LAT = 22.3025;
const LON = 114.174167;
const SCALE = 0.033;
const INITIAL_WIDTH = 1000;
const INITIAL_HEIGHT = 1000;

const CLOUD_FACTOR = 2.0;

const SATELLITE_LISTING = "https://maps.weather.gov.hk/gis-portal/web/data/dirList/satellite_IR_group.txt";
const SATELLITE_IMAGE = "https://maps.weather.gov.hk/gis-portal/web/data/%{year_utc}%{month_utc}%{day_utc}/satellite/IR1-L1B-10/%{hour_utc}%{minute}/%{year}%{month}%{day}%{hour}%{minute}+%{day_start}%{hour_start_utc}%{minute_start}H08.10S_50N_75_150E--L1B.H08_IR1_10_no_coast.png";
const SATELLITE_BOUNDS = {
    minLon: 75,
    minLat: -10,
    maxLon: 150,
    maxLat: 56,
};

const ONE_HOUR = 60 * 60 * 1000;

const COLOURS = {
    TD: "#303030",
    TS: "#28911A",
    STS: "#273AC1",
    T:  "#DD4343",
    ST: "#F78BC0",
    SST: "#F78BC0",
    LOW: "#8FE1ED",
};

/**
 * @typedef Cyclone
 * @prop {number} id 
 * @prop {string} name 
 * @prop {string} nameZH
 * @prop {string} bearing
 * @prop {number} distance
 * @prop {Point[]} track
 */

/**
 * @typedef Point
 * @prop {"P"|"A"|"F"} type 
 * @prop {string} time 
 * @prop {number} latitude 
 * @prop {number} longitude 
 * @prop {string} [classification]
 * @prop {number} [windspeed]
 */

/**
 * @param {{ myLocation, cyclones: Cyclone[], showSatellite: boolean, time?: number }} param0
 */
export default function Map ({ myLocation, cyclones, showSatellite, time }) {
    /** @type {React.MutableRefObject<HTMLCanvasElement} */
    const bgRef = React.useRef();
    /** @type {React.MutableRefObject<HTMLCanvasElement} */
    const satRef = React.useRef();
    
    /** @type {[React.MutableRefObject<HTMLCanvasElement>, { width?: number, height?: number }]} */
    const [ ref, { width = INITIAL_WIDTH, height = INITIAL_HEIGHT} ] = useDimensions();

    const dpr = devicePixelRatio;
    const pixelWidth = dpr * width;
    const pixelHeight = dpr * height;

    const dLon = SCALE * pixelWidth / 2;
    const dLat = SCALE * pixelHeight / 2;

    const bounds = {
        minLat: LAT - dLat,
        minLon: LON - dLon,
        maxLat: LAT + dLat,
        maxLon: LON + dLon,
        width: pixelWidth,
        height: pixelHeight,
    };

    const [ coastline, setCoastline ] = React.useState();
    const [ satelliteList, setSatelliteList ] = React.useState();

    // Satellite Listing
    React.useEffect(() => {
        async function fetchList () {
            const d = await fetch(SATELLITE_LISTING);
            const t = await d.text();
            const lines = textToLines(t);

            const dates = lines.map(l => {
                const d = new Date();
                d.setUTCFullYear(l.substr(0,4));
                d.setUTCMonth(l.substr(4,2) - 1);
                d.setUTCDate(l.substr(6,2));
                d.setUTCHours(l.substr(9,2));
                d.setUTCMinutes(l.substr(1,2));
                d.setUTCSeconds(0);
                d.setUTCMilliseconds(0);
                return d;
            });
            setSatelliteList(dates);
        }

        fetchList();
    }, []);

    // Satellite Image
    React.useEffect(() => {
        if (satRef.current) {
            const selectedImage = new Date(time || Date.now());
            selectedImage.setMinutes(Math.floor(selectedImage.getMinutes() / 10) * 10);
            selectedImage.setSeconds(0);
            selectedImage.setTime(+selectedImage - ONE_HOUR);
                
            const ctx = satRef.current.getContext("2d");

            if (showSatellite) {
                const satUrl = SATELLITE_IMAGE.replace(/%{([a-z_]+)}/g, (match, key) => {
                    if (key === "year") return selectedImage.getUTCFullYear().toString();
                    if (key === "year_utc") return selectedImage.getFullYear().toString();
                    if (key === "month") return (selectedImage.getMonth()+1).toString().padStart(2, "0");
                    if (key === "month_utc") return (selectedImage.getUTCMonth()+1).toString().padStart(2, "0");
                    if (key === "day") return selectedImage.getDate().toString().padStart(2, "0");
                    if (key === "day_utc") return selectedImage.getUTCDate().toString().padStart(2, "0");
                    if (key === "hour") return selectedImage.getHours().toString().padStart(2, "0");
                    if (key === "hour_utc") return selectedImage.getUTCHours().toString().padStart(2, "0");
                    const minutes = Math.floor(selectedImage.getMinutes() / 10) * 10;
                    if (key === "minute") return minutes.toString().padStart(2, "0");

                    const now_start = new Date(+selectedImage - 10 * 60 * 1000);
                    if (key === "day_start") {
                        return now_start.getUTCDate().toString().padStart(2, "0");
                    }
                    if (key === "hour_start_utc") {
                        return now_start.getUTCHours().toString().padStart(2, "0");
                    }
                    if (key === "minute_start") {
                        const minute_start = Math.floor(now_start.getMinutes() / 10) * 10;
                        return minute_start.toString().padStart(2, "0");
                    }

                    return match;
                });

                const img = new Image(800, 724);
                img.src = satUrl;
                img.onload = () => {
                    const { x: x1, y: y1 } = getPosition({ longitude: SATELLITE_BOUNDS.minLon, latitude: SATELLITE_BOUNDS.maxLat }, bounds);
                    const { x: x2, y: y2 } = getPosition({ longitude: SATELLITE_BOUNDS.maxLon, latitude: SATELLITE_BOUNDS.minLat }, bounds);
                    ctx.drawImage(img, x1, y1, x2 - x1, y2 - y1);
                }
            } else {
                ctx.clearRect(0, 0, bounds.width, bounds.height);
            }
        }
    }, [satelliteList, bounds, satRef, showSatellite, time]);

    // Cyclone Track
    React.useEffect(() => {
        if (ref.current) {
            const ctx = ref.current.getContext("2d");

            ctx.clearRect(0, 0, bounds.width, bounds.height);

            if (myLocation) {
                const { x, y } = getPosition(myLocation, bounds);
                ctx.beginPath();
                const r = dpr * 2.0;
                ctx.ellipse(x, y, r, r, 0, 0, Math.PI * 2);
                ctx.fillStyle = "#FF0000";
                ctx.fill();
            }

            for (const cyclone of cyclones) {
                const current = findCurrent(cyclone, time);

                if (!showSatellite && current && current.windspeed) {
                    const { x, y } = getPosition(current, bounds);
                    ctx.beginPath();
                    const r = current.windspeed * CLOUD_FACTOR * dpr;
                    ctx.ellipse(x, y, r, r, 0, 0, Math.PI * 2);
                    const grad = ctx.createRadialGradient(x, y, 10 * dpr, x, y, r);
                    grad.addColorStop(0, "#C0C0C0");
                    grad.addColorStop(0.9, "#C0C0C0");
                    grad.addColorStop(1, "#FFFFFF");
                    ctx.fillStyle = grad;
                    ctx.globalAlpha = 0.5;
                    ctx.fill();
                    ctx.globalAlpha = 1;
                    // ctx.strokeStyle = "#FF0000";
                    // ctx.lineWidth = 1 * dpr;
                    // ctx.stroke();

                }

                const segments = breakIntoSegments(cyclone);

                for (let i = 1; i < segments.length; i++) {
                    const segment = segments[i-1];
                    const next_segment = segments[i];

                    const segment_p1 = segment[0];
                    const next_segment_p1 = next_segment[0];

                    const curr_colour = COLOURS[segment_p1.classification];
                    const next_colour = COLOURS[next_segment_p1.classification];
                    
                    let colour = curr_colour;
                    if (curr_colour !== next_colour) {
                        const { x: x0, y: y0 } = getPosition(segment_p1, bounds);
                        const { x: x1, y: y1 } = getPosition(next_segment_p1, bounds);
                        colour = ctx.createLinearGradient(x0, y0, x1, y1);
                        colour.addColorStop(0, curr_colour);
                        colour.addColorStop(1, next_colour);
                    }

                    const thickness = 4 * dpr;
                    
                    const dash = (next_segment_p1.type === "P") ? [] : [thickness * 2, thickness * 2];
                    ctx.setLineDash(dash);
                    
                    strokeLine(ctx, bounds, [ ...segment, next_segment_p1 ], colour, thickness);

                    ctx.setLineDash([]);
                }

                const currentColour = "#800080";

                for (const point of cyclone.track) {
                    if (point.windspeed && point.classification || point === current) {
                        ctx.beginPath();
                        const { x, y } = getPosition(point, bounds);
                        const r = (point.windspeed || 50) * 0.1 * dpr;
                        ctx.ellipse(x, y, r, r, 0, 0, Math.PI * 2);
                        ctx.fillStyle = (point === current) ? currentColour : COLOURS[point.classification];
                        ctx.fill();
                    }
                }

                if (current) {
                    const { x, y } = getPosition(current, bounds);
                    ctx.strokeStyle = "#FFFFFF";
                    ctx.fillStyle = currentColour;
                    ctx.font = `${Math.floor(12 * dpr)}px sans-serif`;
                    const n = `${cyclone.name} ${cyclone.nameZH}`;
                    ctx.strokeText(n, x, y + 18 * dpr);
                    ctx.fillText(n, x, y + 18 * dpr);
                    const d = current.time.substring(0, 13);
                    ctx.strokeText(d, x, y + 30 * dpr);
                    ctx.fillText(d, x, y + 30 * dpr);
                    if (current.windspeed) {
                        const s = `${current.windspeed} km/h`;
                        ctx.strokeText(s, x, y + 42 * dpr);
                        ctx.fillText(s, x, y + 42 * dpr);
                    }
                }
            }
        }
    }, [myLocation, cyclones, bounds, ref, time, dpr]);

    // Load coastline
    React.useEffect(() => {
        async function fetchCoastline () {
            const coastline = await import("./coastline.json");
            setCoastline(coastline);
        }
        fetchCoastline();
    }, []);

    // Draw Coastline
    React.useEffect(() => {
        if (bgRef.current && coastline) {
            const ctx = bgRef.current.getContext("2d");

            ctx.clearRect(0, 0, bounds.width, bounds.height);

            for (const feature of coastline.features) {
                if (feature.geometry.type === "LineString") {
                    strokeLine(ctx, bounds, feature.geometry.coordinates.map(p => ({ latitude: p[1], longitude: p[0] })), "#80C080", 1);
                }
                else if (feature.geometry.type === "MultiLineString"){
                    for (const coords of feature.geometry.coordinates) {
                        strokeLine(ctx, bounds, coords.map(p => ({ latitude: p[1], longitude: p[0] })), "#80C080", 1);
                    }
                }
            }
        }
    }, [coastline, bounds]);

    return <div style={{ position: "relative" }}>
        <canvas ref={satRef} width={bounds.width} height={bounds.height} style={{ width: "100vw", height: "100vh", position: "absolute", zIndex: -2 }} />
        <canvas ref={bgRef} width={bounds.width} height={bounds.height} style={{ width: "100vw", height: "100vh", position: "absolute", zIndex: -1 }} />
        <canvas ref={ref} width={bounds.width} height={bounds.height} style={{ width: "100vw", height: "100vh" }} />
    </div>;
}

/**
 * @param {string} text
 */
function textToLines (text) {
    return text.split("\n").map(l => l.trim()).filter(l => l.length > 0);
}

/**
 * @param {{ latitude: number, longitude: number }} point
 */
function getPosition (point, bounds) {
    const x = (point.longitude - bounds.minLon) / (bounds.maxLon - bounds.minLon) * bounds.width;
    const y = bounds.height - (point.latitude - bounds.minLat) / (bounds.maxLat - bounds.minLat) * bounds.height;

    return { x, y };
}

function strokeLine(ctx, bounds, points, colour="#000000", lineWidth=1) {
    ctx.strokeStyle = colour;
    ctx.lineWidth = lineWidth;
    ctx.beginPath();
                
    let first = true;
    for (const point of points) {
        const { x, y } = getPosition(point, bounds);
        first ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        first = false;
    }
    ctx.stroke();
}

const DIRECTIONS = "N NNE NE ENE E ESE SE SSE S SSW SW WSW W WNW NW NNW".split(" ");
function compassToRadians (direction) {
    return DIRECTIONS.indexOf(direction) * Math.PI * 2 / DIRECTIONS.length;
}

/**
 * 
 * @param {Cyclone} cyclone
 * @param {number} [time] 
 */
function findCurrent (cyclone, time) {
    let prev = null;
    if (time) {
        for (const point of cyclone.track) {
            if (+new Date(point.time) > time) return prev;
            prev = point;
        }
    }
    return cyclone.track.find(p => p.type === "A")
}

/**
 * 
 * @param {Cyclone} cyclone
 */
function breakIntoSegments (cyclone) {
    const segments = [];
    let currentSet = null;

    for (const point of cyclone.track) {
        if (point.classification) {
            if (currentSet) {
                segments.push(currentSet);
            }

            currentSet = [point];
        } else {
            if (!currentSet) {
                console.warn("Expected a point with classification");
                currentSet = [];
            }
            currentSet.push(point);
        }
    }

    if (currentSet) {
        segments.push(currentSet);
    }

    return segments
}

/**
 * 
 * @param {Date[]} dates 
 * @param {number} time
 * @returns {Date}
 */
function mostRecent (dates, time) {
    let prev = null;
    for (const date of dates) {
        if (time < +date) {
            break;
        }
        prev = date;
    }
    return prev;
}