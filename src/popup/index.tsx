import "~style.css";
import { useEffect } from "react";

const IndexPopup = () => {
  useEffect(() => {
    chrome.runtime.openOptionsPage();
    window.close();
  }, []);

  return <div />;
};

export default IndexPopup;
