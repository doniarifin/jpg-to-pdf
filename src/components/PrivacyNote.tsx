import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faLock } from "@fortawesome/free-solid-svg-icons";

const PrivacyNote = () => (
  <p className="mt-3 text-center text-xs text-gray-400 dark:text-gray-500">
    <FontAwesomeIcon icon={faLock} className="mr-1.5" />
    No files are uploaded. All processing happens right in your browser.
  </p>
);

export default PrivacyNote;
