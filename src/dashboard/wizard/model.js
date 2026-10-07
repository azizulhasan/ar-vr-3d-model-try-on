/**
 * Helpers for the item + model the wizard sets up (AR-72).
 */

/** Items of the post type the wizard is setting up. */
export const itemsFor = (data, postType) =>
  (data.posts && data.posts[postType]) || [];

/** The item picked in the "First 3D model" step, or null. */
export const selectedItem = (state, data) =>
  itemsFor(data, state.postType).find((p) => p.id === state.productId) || null;

/**
 * The model the item will have after Finish, or null when there is
 * nothing to show yet (e.g. the merchant chose to generate one with AI).
 */
export const resolvedModel = (state, data) => {
  const item = selectedItem(state, data);
  const sample = data.sample_model || {};

  switch (state.modelSource) {
    case "current":
      return item && item.src
        ? { src: item.src, ios_src: item.ios_src, poster: item.poster, alt: item.title }
        : null;
    case "sample":
      return { src: sample.src, ios_src: "", poster: sample.poster, alt: sample.alt };
    case "library":
      return state.libraryModel && state.libraryModel.src ? state.libraryModel : null;
    default:
      return null;
  }
};

/**
 * Product block sent to the save route, or null when the item's model
 * is not changed by the wizard.
 */
export const productPayload = (state, data) => {
  const item = selectedItem(state, data);
  if (!item) {
    return null;
  }
  const payload = { id: item.id };

  if (state.modelSource === "sample" || state.modelSource === "library") {
    const model = resolvedModel(state, data);
    if (model) {
      payload.src = model.src || "";
      payload.ios_src = model.ios_src || "";
      payload.poster = model.poster || "";
      payload.alt = model.alt || item.title;
    }
  }
  if (state.tryonMode !== "keep") {
    payload.ar_placement = state.tryonMode;
  }

  return Object.keys(payload).length > 1 ? payload : null;
};
