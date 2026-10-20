import '../src/styles/index.css';

import type { Preview } from '@storybook/react-vite';
import type { RequestHandler } from 'msw';

import { worker } from '../src/mocks/browser';
import { StoryProviders } from './story-providers';

interface MswParameters {
  readonly msw?: { readonly handlers?: RequestHandler[] };
}

let workerStarted: Promise<unknown> | undefined;

const preview: Preview = {
  // MSW runs in every story, through the same worker as `VITE_API_MOCKING=true pnpm dev`.
  async beforeEach({ parameters }) {
    workerStarted ??= worker.start({ onUnhandledFrame: 'bypass', quiet: true });
    await workerStarted;
    worker.use(...((parameters as MswParameters).msw?.handlers ?? []));
    return () => {
      worker.resetHandlers();
    };
  },
  decorators: [
    (Story) => (
      <StoryProviders>
        <Story />
      </StoryProviders>
    ),
  ],
};

export default preview;
