import { useRef, useState, useCallback } from "react";
import WebView from "react-native-webview";
import { MapWebViewMessage } from "../types";

export interface MapCommunicationResult {
  webViewRef: React.RefObject<WebView | null>;
  mapVersion: number;
  sendToMap: (data: object) => void;
  handleWebViewMessage: (event: { nativeEvent: { data: string } }) => void;
}

export function useMapCommunication(
  onMarkerClick: (groupIndex: number) => void,
  onMarkerClickByDeliveryId: (deliveryId: string) => void,
): MapCommunicationResult {
  const webViewRef = useRef<WebView>(null);
  const [mapVersion, setMapVersion] = useState<number>(0);

  const onMarkerClickRef = useRef(onMarkerClick);
  onMarkerClickRef.current = onMarkerClick;
  const onMarkerClickByIdRef = useRef(onMarkerClickByDeliveryId);
  onMarkerClickByIdRef.current = onMarkerClickByDeliveryId;

  const sendToMap = useCallback((data: object) => {
    if (!webViewRef.current) {
      console.log(
        "[useMapCommunication][DEBUG] sendToMap: webViewRef.current es null",
      );
      return;
    }
    webViewRef.current.injectJavaScript(
      `handleMessage(${JSON.stringify(JSON.stringify(data))});true;`,
    );
  }, []);

  const handleWebViewMessage = useCallback(
    (event: { nativeEvent: { data: string } }) => {
      try {
        const rawData = event?.nativeEvent?.data;
        if (rawData == null) {
          console.log(
            "[useMapCommunication][DEBUG] handleWebViewMessage: nativeEvent.data es null/undefined",
          );
          return;
        }
        const msg = JSON.parse(rawData) as MapWebViewMessage;
        if (!msg || !msg.type) {
          console.log(
            "[useMapCommunication][DEBUG] handleWebViewMessage: mensaje sin type",
            JSON.stringify(msg),
          );
          return;
        }
        if (msg.type === "MAP_READY") {
          setMapVersion((v) => v + 1);
        } else if (msg.type === "MARKER_CLICK") {
          if (msg.deliveryId) {
            onMarkerClickByIdRef.current(msg.deliveryId);
          } else if (msg.groupIndex !== undefined) {
            onMarkerClickRef.current(msg.groupIndex);
          } else {
            console.log(
              "[useMapCommunication][DEBUG] handleWebViewMessage: MARKER_CLICK sin deliveryId ni groupIndex",
            );
          }
        }
      } catch (err) {
        console.log(
          "[useMapCommunication][DEBUG] handleWebViewMessage: error parseando mensaje",
          err,
          "raw:",
          event?.nativeEvent?.data,
        );
      }
    },
    [],
  );

  return { webViewRef, mapVersion, sendToMap, handleWebViewMessage };
}
