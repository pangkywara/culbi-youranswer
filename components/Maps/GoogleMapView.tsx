/**
 * GoogleMapView — wrapper around react-native-maps MapView that works
 * around a known blank-tiles issue with New Architecture (Fabric).
 *
 * On mount the underlying native MapView sometimes fails to load tiles.
 * We fix this by toggling `mapType` from "none" → the real type after a
 * short delay, which forces the Google Maps tile renderer to re-initialise.
 *
 * Drop-in replacement: use `<GoogleMapView>` everywhere you used `<MapView>`.
 */
import React, { forwardRef, useEffect, useState } from "react";
import MapView from "react-native-maps";
import type { MapViewProps } from "react-native-maps";

const TILE_RELOAD_DELAY_MS = 100;

const GoogleMapView = forwardRef<MapView, MapViewProps>(
    function GoogleMapView({ mapType = "standard", children, ...rest }, ref) {
        // Start with "none" so no tiles are attempted during the first layout
        // pass. After a short delay, switch to the real mapType which forces
        // the Fabric interop bridge to re-initialise the tile renderer.
        const [activeMapType, setActiveMapType] = useState<
            MapViewProps["mapType"]
        >("none");

        useEffect(() => {
            const timer = setTimeout(() => {
                setActiveMapType(mapType);
            }, TILE_RELOAD_DELAY_MS);
            return () => clearTimeout(timer);
        }, [mapType]);

        return (
            <MapView ref={ref} mapType={activeMapType} {...rest}>
                {children}
            </MapView>
        );
    },
);

export default GoogleMapView;
