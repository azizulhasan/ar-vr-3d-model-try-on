import { toast } from "react-toastify";

const configuration = {
  position: toast.POSITION.TOP_RIGHT,
  autoClose: 3000,
  hideProgressBar: false,
  closeOnClick: true,
  pauseOnHover: true,
  draggable: true,
  progress: undefined,
};

const notify = (message, type = "success", config = {}) => {
  let toastConfig = {
    ...configuration,
    ...config,
  }
  switch (type) {
    case "success":
      toast.success(message);
      break;
    case "error":
      toast.error(message, toastConfig);
      break
    case "warn":
      toast.warn(message, toastConfig);
      break;
    case "info":
      toast.info(message, toastConfig);
      break;
    default:
      toast.success(message, toastConfig);
  }
};

export default notify;