// ViewerTypeSelector — thin re-export.
//
// The real RN port lives at `src/components/landing/ViewerTypeSelector.tsx`
// (two-button pill toggle "I am a…"). Two callers import
// `ViewerTypeSelector` from this legacy path, so redirect to the real
// implementation here.

export {
  ViewerTypeSelector,
  type ViewerType,
} from '@/components/landing/ViewerTypeSelector';
export { ViewerTypeSelector as default } from '@/components/landing/ViewerTypeSelector';
