export default {
  prompt: jest.fn().mockResolvedValue({}),
  createPromptModule: jest.fn(() => jest.fn().mockResolvedValue({})),
};