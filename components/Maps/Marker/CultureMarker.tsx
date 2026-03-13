import React, { memo } from 'react';
import { PlaceLandmark } from '../../../types';
import PlaceMarker from './PlaceMarker';

interface CultureMarkerProps {
  landmark: PlaceLandmark;
}

/**
 * CultureMarker — renders ONLY the visual pin (PlaceMarker).
 *
 * Wrapped in React.memo so it only re-renders when `landmark.id`,
 * `landmark.name`, or `landmark.hasCulturalTip` actually changes.
 * Without memo, every DiscoveryMap state update (e.g. `loading` toggle,
 * region change) would rebuild every marker's React subtree on the JS thread,
 * consuming frame budget that should go to the UI/render thread for smooth
 * scroll and zoom.
 *
 * Press handling is done via Marker.onPress in the parent (DiscoveryMap) so
 * that the native tap is registered reliably on both iOS and Android with
 * PROVIDER_GOOGLE.
 */
const CultureMarker = memo(function CultureMarker({ landmark }: CultureMarkerProps) {
  return (
    <PlaceMarker
      name={landmark.name}
      hasCulturalTip={landmark.hasCulturalTip}
    />
  );
});

export default CultureMarker;