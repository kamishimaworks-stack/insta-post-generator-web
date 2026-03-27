import { create } from "zustand";
import type { LoadingStatus } from "@/types";

type GenerationState = {
  readonly theme: string;
  readonly videoDescription: string;
  readonly taste: string;
  readonly imageFile: File | null;
  readonly imagePreview: string | null;
  readonly imagePath: string;
  readonly caption: string;
  readonly hashtags: string;
  readonly imageAnalysis: string;
  readonly loadingStatus: LoadingStatus;
  readonly errorMessage: string;

  readonly setTheme: (theme: string) => void;
  readonly setVideoDescription: (desc: string) => void;
  readonly setTaste: (taste: string) => void;
  readonly setImageFile: (file: File | null) => void;
  readonly setImagePreview: (preview: string | null) => void;
  readonly setImagePath: (path: string) => void;
  readonly setResult: (caption: string, hashtags: string, imageAnalysis: string) => void;
  readonly setCaption: (caption: string) => void;
  readonly setHashtags: (hashtags: string) => void;
  readonly setLoadingStatus: (status: LoadingStatus) => void;
  readonly setErrorMessage: (msg: string) => void;
  readonly resetInput: () => void;
  readonly resetResult: () => void;
};

export const useGenerationStore = create<GenerationState>((set) => ({
  theme: "",
  videoDescription: "",
  taste: "",
  imageFile: null,
  imagePreview: null,
  imagePath: "",
  caption: "",
  hashtags: "",
  imageAnalysis: "",
  loadingStatus: "idle",
  errorMessage: "",

  setTheme: (theme) => set({ theme }),
  setVideoDescription: (videoDescription) => set({ videoDescription }),
  setTaste: (taste) => set({ taste }),
  setImageFile: (imageFile) => set({ imageFile }),
  setImagePreview: (imagePreview) => set({ imagePreview }),
  setImagePath: (imagePath) => set({ imagePath }),
  setResult: (caption, hashtags, imageAnalysis) =>
    set({ caption, hashtags, imageAnalysis }),
  setCaption: (caption) => set({ caption }),
  setHashtags: (hashtags) => set({ hashtags }),
  setLoadingStatus: (loadingStatus) => set({ loadingStatus }),
  setErrorMessage: (errorMessage) => set({ errorMessage }),
  resetInput: () =>
    set({
      theme: "",
      videoDescription: "",
      taste: "",
      imageFile: null,
      imagePreview: null,
      imagePath: "",
    }),
  resetResult: () => set({ caption: "", hashtags: "", imageAnalysis: "" }),
}));
