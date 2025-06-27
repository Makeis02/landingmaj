import { useEffect } from "react";

// Déclare fbq et _fbq sur window pour TypeScript
declare global {
  interface Window {
    fbq?: (...args: any[]) => void;
    _fbq?: any;
  }
}

const FACEBOOK_PIXEL_ID = "408487235316215";

const FacebookPixel = () => {
  useEffect(() => {
    if (!window.fbq) {
      (function (f, b, e, v, n, t, s) {
        if ((f as any).fbq) return;
        n = (f as any).fbq = function () {
          n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
        };
        if (!(f as any)._fbq) (f as any)._fbq = n;
        n.push = n;
        n.loaded = true;
        n.version = "2.0";
        n.queue = [];
        t = b.createElement(e);
        t.async = true;
        t.src = v;
        s = b.getElementsByTagName(e)[0];
        s.parentNode.insertBefore(t, s);
      })(window, document, "script", "https://connect.facebook.net/fr_FR/fbevents.js");

      window.fbq && window.fbq("init", FACEBOOK_PIXEL_ID);
    }
    window.fbq && window.fbq("track", "PageView");
  }, []);

  return (
    <noscript>
      <img
        height="1"
        width="1"
        style={{ display: "none" }}
        src={`https://www.facebook.com/tr?id=${FACEBOOK_PIXEL_ID}&ev=PageView&noscript=1`}
        alt=""
      />
    </noscript>
  );
};

export default FacebookPixel;
