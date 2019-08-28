import { useState, useRef, useLayoutEffect } from "react";

/** 
 * @typedef DimensionObject
 * @prop {number} [width]
 * @prop {number} [height]
 * @prop {number} [top]
 * @prop {number} [left]
 * @prop {number} [right]
 * @prop {number} [bottom]
 * @prop {number} [x]
 * @prop {number} [y]
 */

function getDimensionObject (node) {
    const rect = node.getBoundingClientRect();

    return {
        width: rect.width,
        height: rect.height,
        top: "x" in rect ? rect.x : rect.top,
        left: "y" in rect ? rect.y : rect.left,
        x: "x" in rect ? rect.x : rect.left,
        y: "y" in rect ? rect.y : rect.top,
        right: rect.right,
        bottom: rect.bottom
    };
}

/**
 *  @return {[React.MutableRefObject, DimensionObject]}
 */
function useDimensions() {
    const [dimensions, setDimensions] = useState({});
    const ref = useRef();

    useLayoutEffect(() => {
        if (ref.current) {
            const measure = () =>
                window.requestAnimationFrame(() =>
                    setDimensions(getDimensionObject(ref.current))
                );
            measure();

            window.addEventListener("resize", measure);

            return () => {
                window.removeEventListener("resize", measure);
            };
        }
    }, [ref.current]);

    return [ref, dimensions];
}

export default useDimensions;