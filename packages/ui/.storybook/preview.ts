// Storybook renders no app layout, so the design tokens + global baseline the
// apps import in their shells are imported here instead.
import "../src/styles/tokens.css";
import "../src/styles/base.css";

const preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
};

export default preview;
