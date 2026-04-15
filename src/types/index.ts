export type Profile = {
  readonly id: string;
  readonly user_id: string;
  readonly account_name: string;
  readonly target_audience: string;
  readonly purpose: string;
  readonly genre: string;
  readonly follower_scale: string;
  readonly competitors: string;
  readonly tone: string;
  readonly fixed_hashtags: string;
  readonly custom_instructions: string;
  readonly created_at: string;
  readonly updated_at: string;
};

export type ProfileInput = {
  readonly account_name: string;
  readonly target_audience: string;
  readonly purpose: string;
  readonly genre: string;
  readonly follower_scale: string;
  readonly competitors: string;
  readonly tone: string;
  readonly fixed_hashtags: string;
  readonly custom_instructions: string;
};

export type SetupStep = 1 | 2 | 3 | 4 | 5 | 6;

export type StyleAnalysisRequest = {
  readonly past_posts: readonly string[];
  readonly past_hashtags: string;
};

export type StyleAnalysisResponse = {
  readonly success: boolean;
  readonly data?: {
    readonly tone_analysis: string;
    readonly hashtag_strategy: string;
  };
  readonly error?: {
    readonly code: string;
    readonly message: string;
  };
};

export type GenerateRequest = {
  readonly image_paths: readonly string[];
  readonly theme: string;
  readonly video_description: string;
  readonly taste?: string;
};

export type GenerateResponse = {
  readonly success: true;
  readonly data: {
    readonly caption: string;
    readonly hashtags: string;
    readonly image_analysis: string;
  };
};

export type ErrorResponse = {
  readonly success: false;
  readonly error: {
    readonly code: ErrorCode;
    readonly message: string;
  };
};

export type ApiResponse = GenerateResponse | ErrorResponse;

export type ErrorCode =
  | "VALIDATION_ERROR"
  | "UNAUTHORIZED"
  | "RATE_LIMIT_EXCEEDED"
  | "IMAGE_ANALYSIS_FAILED"
  | "GENERATION_FAILED"
  | "INTERNAL_ERROR";

export type LoadingStatus = "idle" | "uploading" | "generating" | "analyzing";

export type ValidationResult =
  | { readonly valid: true }
  | { readonly valid: false; readonly message: string };
