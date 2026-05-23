import React from "react";
import WebView from "react-native-webview";
import { LEAFLET_MAP_HTML } from "../leafletMapHtml";
import { styles } from "../tripMapStyles";

interface TripMapViewProps {
  webViewRef: React.RefObject<WebView | null>;
  onMessage: (event: { nativeEvent: { data: string } }) => void;
}

const TripMapView: React.FC<TripMapViewProps> = React.memo(
  ({ webViewRef, onMessage }) => {
    return (
      <WebView
        ref={webViewRef}
        style={styles.map}
        source={{ html: LEAFLET_MAP_HTML }}
        originWhitelist={["*"]}
        javaScriptEnabled
        domStorageEnabled
        onMessage={onMessage}
      />
    );
  },
);

TripMapView.displayName = "TripMapView";
export default TripMapView;
