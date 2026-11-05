/// <reference types="vite/client" />

// Operator details come from .env.local, which Git ignores. See .env.example.
interface ImportMetaEnv {
  readonly VITE_OPERATOR_NAME?: string;
  readonly VITE_OPERATOR_STREET?: string;
  readonly VITE_OPERATOR_CITY?: string;
  readonly VITE_OPERATOR_EMAIL?: string;
  // Address of the page, for the Thunderbird extension.
  readonly VITE_SITE_URL?: string;
  readonly VITE_API_BASE?: string;
}
