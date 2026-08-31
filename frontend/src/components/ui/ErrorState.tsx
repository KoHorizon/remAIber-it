import { Button } from "./Button";
import "./ErrorState.css";

type Props = {
  /** The failure to show — normally an ApiError message from the backend. */
  message: string;
  title?: string;
  onRetry?: () => void;
};

export function ErrorState({
  message,
  title = "Something went wrong",
  onRetry,
}: Props) {
  return (
    <div className="error-state" role="alert">
      <span className="error-state-icon" aria-hidden="true">
        !
      </span>
      <h3 className="error-state-title">{title}</h3>
      <p className="error-state-message">{message}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}
