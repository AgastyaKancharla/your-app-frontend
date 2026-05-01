import { render, screen } from "@testing-library/react";
import axios from "axios";
import App from "./App";

jest.mock("axios", () => ({
  defaults: {},
  get: jest.fn(),
  post: jest.fn(),
  interceptors: {
    request: {
      use: jest.fn(() => 1),
      eject: jest.fn()
    },
    response: {
      use: jest.fn(() => 1),
      eject: jest.fn()
    }
  }
}));

beforeEach(() => {
  axios.get.mockRejectedValue({ response: { status: 401 } });
  axios.post.mockRejectedValue({ response: { status: 401 } });
});

afterEach(() => {
  jest.clearAllMocks();
});

test("renders the login screen", async () => {
  render(<App />);

  expect(await screen.findByRole("heading", { name: /wevalue login/i })).toBeInTheDocument();
  expect(screen.getByPlaceholderText(/email/i)).toBeInTheDocument();
  expect(screen.getByPlaceholderText(/password/i)).toBeInTheDocument();
});
