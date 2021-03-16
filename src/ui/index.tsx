import React from 'react';
import ReactDOM from 'react-dom';
import {App} from "./App";
import "./style.scss";
import {Api} from "../core/api";

declare global {
  interface Window {
    api: Api
  }
}

ReactDOM.render(
  <React.StrictMode>
    <App/>
  </React.StrictMode>,
  document.getElementById('root')
);
