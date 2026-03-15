import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const ScrollToTop = () => {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (!("scrollRestoration" in window.history)) return;

    const previous = window.history.scrollRestoration;
    window.history.scrollRestoration = "manual";

    return () => {
      window.history.scrollRestoration = previous;
    };
  }, []);

  useEffect(() => {
    const scrollToElWithOffset = (el) => {
      if (!el) return;
      // wait briefly to allow sticky elements to settle
      setTimeout(() => {
        const nav = document.querySelector(".navbar");
        const navHeight = nav ? nav.offsetHeight : 0;
        // account for the filters/search header if present on products page
        const filters = document.querySelector(".filters-section");
        const filtersHeight = filters ? filters.offsetHeight : 0;
        const extraGap = 24; // small extra gap to ensure message fully visible
        const offset = navHeight + filtersHeight + extraGap; // gap below navbar+filters
        const top = el.getBoundingClientRect().top + window.scrollY - offset;
        window.scrollTo({ top, left: 0, behavior: "auto" });
      }, 40);
    };

    // If a hash is provided, try to scroll to that element first
    if (hash) {
      const id = hash.replace("#", "");
      const el = document.getElementById(id);
      if (el) {
        scrollToElWithOffset(el);
        return;
      }
    }

    // Scroll to top on route or query change
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [pathname, hash]);

  return null;
};

export default ScrollToTop;
