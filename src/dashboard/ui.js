import React, { Fragment, useEffect, useState } from "react";
import { __ } from "@wordpress/i18n";
import BorderCard from "./components/dashboard/settings/BorderCard";
import Switch from "./components/dashboard/settings/Switch";
import Radio from "./components/dashboard/settings/Radio";
import Checkbox from "./components/dashboard/settings/Checkbox";
import PremiumBadge from "../context/PremiumBadge";

/**
 * Field label, same classes as the Settings tab.
 */
export const Label = ({ children, htmlFor }) => (
  <label htmlFor={htmlFor} className="art-block art-font-medium art-text-base">
    {children}
  </label>
);

/**
 * Help text under a field, same classes as the Settings tab.
 */
export const Desc = ({ children }) => (
  <p className="art-text-sm art-text-gray-400 art-leading-snug">{children}</p>
);

/**
 * The UI kit handed to Pro through wp.hooks filters — wizard steps
 * (`atlasAr.wizard.steps`, AR-72) and the bulk compression card
 * (`atlasAr.compression.bulkPanel`, AR-73).
 *
 * Pro builds its UI from these components instead of shipping its own
 * React and styles: it renders inside this React tree with this plugin's
 * look, and `h` is this bundle's createElement, so hooks work. Only use
 * classes that already exist in this plugin's compiled CSS.
 */
const ui = {
  h: React.createElement,
  Fragment,
  useState,
  useEffect,
  __,
  BorderCard,
  Switch,
  Radio,
  Checkbox,
  PremiumBadge,
  Label,
  Desc,
};

export default ui;
