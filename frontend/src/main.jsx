import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";

// This is the root of the React application.
// ReactDOM.createRoot attaches our <App /> component to the
// <div id="root"></div> element declared in index.html.
ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
