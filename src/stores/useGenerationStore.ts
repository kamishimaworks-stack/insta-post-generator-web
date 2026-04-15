import { create } from "zustand";
import type { LoadingStatus } from "@/types";

type Candidate = {
  readonly caption: string;
  readonly hashtags: string;
  readonly imageAnalysis: string;
};

type GenerationState = {
  readonly theme: string;
  readonly videoDescription: string;
  readonly taste: string;
  readonly imageFiles: File[];
  readonly imagePreviews: string[];
  readonly imagePaths: string[];
  readonly caption: string;
  readonly hashtags: string;
  readonly imageAnalysis: string;
  readonly candidates: Candidate[];
  readonly activeCandidateIndex: number;
  readonly loadingStatus: LoadingStatus;
  readonly errorMessage: string;

  readonly setTheme: (theme: string) => void;
  readonly setVideoDescription: (desc: string) => void;
  readonly setTaste: (taste: string) => void;
  readonly addImageFiles: (files: File[]) => void;
  readonly removeImage: (index: number) => void;
  readonly setImagePaths: (paths: string[]) => void;
  readonly setResult: (caption: string, hashtags: string, imageAnalysis: string) => void;
  readonly setCaption: (caption: string) => void;
  readonly setHashtags: (hashtags: string) => void;
  readonly selectCandidate: (index: number) => void;
  readonly setLoadingStatus: (status: LoadingStatus) => void;
  readonly setErrorMessage: (msg: string) => void;
  readonly resetInput: () => void;
  readonly resetResult: () => void;
};

export const useGenerationStore = create<GenerationState>((set, get) => ({
  theme: "",
  videoDescription: "",
  taste: "",
  imageFiles: [],
  imagePreviews: [],
  imagePaths: [],
  caption: "",
  hashtags: "",
  imageAnalysis: "",
  candidates: [],
  activeCandidateIndex: 0,
  loadingStatus: "idle",
  errorMessage: "",

  setTheme: (theme) => set({ theme }),
  setVideoDescription: (videoDescription) => set({ videoDescription }),
  setTaste: (taste) => set({ taste }),
  addImageFiles: (files: File[]) => {
    const { imageFiles, imagePreviews } = get();
    const newPreviews = files.map((f) => URL.createObjectURL(f));
    set({
      imageFiles: [...imageFiles, ...files],
      imagePreviews: [...imagePreviews, ...newPreviews],
    });
  },
  removeImage: (index: number) => {
    const { imageFiles, imagePreviews, imagePaths } = get();
    const newPreviews = [...imagePreviews];
    URL.revokeObjectURL(newPreviews[index]);
    newPreviews.splice(index, 1);
    const newFiles = [...imageFiles];
    newFiles.splice(index, 1);
    const newPaths = [...imagePaths];
    newPaths.splice(index, 1);
    set({ imageFiles: newFiles, imagePreviews: newPreviews, imagePaths: newPaths });
  },
  setImagePaths: (imagePaths) => set({ imagePaths }),
  setResult: (caption, hashtags, imageAnalysis) => {
    const newCandidate = { caption, hashtags, imageAnalysis };
    const newCandidates = [...get().candidates, newCandidate];
    set({
      candidates: newCandidates,
      activeCandidateIndex: newCandidates.length - 1,
      caption,
      hashtags,
      imageAnalysis,
    });
  },
  setCaption: (caption) => {
    const { candidates, activeCandidateIndex } = get();
    const updated = candidates.map((c, i) =>
      i === activeCandidateIndex ? { ...c, caption } : c
    );
    set({ caption, candidates: updated });
  },
  setHashtags: (hashtags) => {
    const { candidates, activeCandidateIndex } = get();
    const updated = candidates.map((c, i) =>
      i === activeCandidateIndex ? { ...c, hashtags } : c
    );
    set({ hashtags, candidates: updated });
  },
  selectCandidate: (index) => {
    const candidate = get().candidates[index];
    if (!candidate) return;
    set({
      activeCandidateIndex: index,
      caption: candidate.caption,
      hashtags: candidate.hashtags,
      imageAnalysis: candidate.imageAnalysis,
    });
  },
  setLoadingStatus: (loadingStatus) => set({ loadingStatus }),
  setErrorMessage: (errorMessage) => set({ errorMessage }),
  resetInput: () => {
    get().imagePreviews.forEach((url) => URL.revokeObjectURL(url));
    set({
      theme: "",
      videoDescription: "",
      taste: "",
      imageFiles: [],
      imagePreviews: [],
      imagePaths: [],
    });
  },
  resetResult: () =>
    set({ caption: "", hashtags: "", imageAnalysis: "", candidates: [], activeCandidateIndex: 0 }),
}));
