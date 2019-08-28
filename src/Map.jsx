import React from 'react';
import useDimensions from './use-dimensions';

// COORDS of HKO
const LAT = 22.3025;
const LON = 114.174167;
const SCALE = 0.033;
const INITIAL_WIDTH = 1000;
const INITIAL_HEIGHT = 1000;

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
 * @param {{ myLocation, cyclones: Cyclone[] }} param0
 */
export default function Map ({ myLocation, cyclones }) {
    /** @type {React.MutableRefObject<HTMLCanvasElement} */
    const bgRef = React.useRef();

    const [ ref, { width = INITIAL_WIDTH, height = INITIAL_HEIGHT} ] = useDimensions();

    const dLon = SCALE * width / 2;
    const dLat = SCALE * height / 2;

    const bounds = {
        minLat: LAT - dLat,
        minLon: LON - dLon,
        maxLat: LAT + dLat,
        maxLon: LON + dLon,
        width,
        height,
    };

    const [ coastline, setCoastline ] = React.useState();

    // Cyclone Track
    React.useEffect(() => {
        if (ref.current) {
            const ctx = ref.current.getContext("2d");

            ctx.clearRect(0, 0, bounds.width, bounds.height);

            if (myLocation) {
                const { x, y } = getPosition(myLocation, bounds);
                ctx.beginPath();
                ctx.ellipse(x, y, 2, 2, 0, 0, Math.PI * 2);
                ctx.fillStyle = "#FF0000";
                ctx.fill();
            }

            for (const cyclone of cyclones) {
                const current = cyclone.track.find(p => p.type === "A");

                if (current) {
                    const { x, y } = getPosition(current, bounds);
                    ctx.beginPath();
                    const r = current.windspeed * 2.0;
                    ctx.ellipse(x, y, r, r, 0, 0, Math.PI * 2);
                    ctx.fillStyle = "#C0C0C0";
                    ctx.globalAlpha = 0.5;
                    ctx.fill();
                    ctx.globalAlpha = 1;
                }

                strokeLine(ctx, bounds, cyclone.track.filter(p => p.type === "P" || p.type === "A"), "#000000", 4);
                strokeLine(ctx, bounds, cyclone.track.filter(p => p.type === "F" || p.type === "A"), "#808080", 4);

                const currentColour = "#800080";

                for (const point of cyclone.track) {
                    if (point.windspeed) {
                        ctx.beginPath();
                        const { x, y } = getPosition(point, bounds);
                        const r = point.windspeed * 0.1;
                        ctx.ellipse(x, y, r, r, 0, 0, Math.PI * 2);
                        ctx.fillStyle = point.type === "P" ? "#000000" : point.type === "F" ? "#808080" : currentColour;
                        ctx.fill();
                    }
                }

                if (current) {
                    const { x, y } = getPosition(current, bounds);
                    ctx.strokeStyle = "#FFFFFF";
                    ctx.fillStyle = currentColour;

                    const d = current.time.substring(0, 13);
                    ctx.strokeText(d, x, y + 30);
                    ctx.fillText(d, x, y + 30);
                    const s = `${current.windspeed} km/h`;
                    ctx.strokeText(s, x, y + 42);
                    ctx.fillText(s, x, y + 42);
                }
            }
        }
    }, [myLocation, cyclones, bounds.width, bounds.height]);

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

            ctx.clearRect(0, 0, INITIAL_WIDTH, INITIAL_HEIGHT);

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
    }, [coastline, bounds.width, bounds.height]);

    return <div style={{ position: "relative" }}>
        <canvas ref={bgRef} width={bounds.width} height={bounds.height} style={{ width: "100vw", height: "100vh", position: "absolute", zIndex: -1 }} />
        <canvas ref={ref} width={bounds.width} height={bounds.height} style={{ width: "100vw", height: "100vh" }} />
    </div>;
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