import {
  createSlice,
  createAsyncThunk,
  type PayloadAction,
} from "@reduxjs/toolkit";
import axios from "axios";
import api from "../services/api";

export interface AuthUser {
  _id: string;
  fullName: string;
  email: string;
  phoneNo?: string;
  profileImg?: string;
  role?: string;
}

export type AuthSliceStatus = "idle" | "loading";

export interface AuthState {
  user: AuthUser | null;
  /** false until the first session check (/current-user) finishes */
  initialized: boolean;
  status: AuthSliceStatus;
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  initialized: false,
  status: "idle",
  error: null,
};

function errorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as { message?: string } | undefined;
    return data?.message ?? err.message ?? "Request failed";
  }
  return "Something went wrong";
}

/** Restore session from httpOnly cookies */
export const hydrateAuth = createAsyncThunk("auth/hydrate", async () => {
  try {
    const { data } = await api.get<{ data: AuthUser }>("/users/current-user");
    return data.data;
  } catch {
    return null;
  }
});

export const loginUser = createAsyncThunk(
  "auth/login",
  async (payload: { email: string; password: string }, { rejectWithValue }) => {
    try {
      const { data } = await api.post<{ data: { user: AuthUser } }>(
        "/users/login",
        payload,
      );
      return data.data.user;
    } catch (e) {
      return rejectWithValue(errorMessage(e));
    }
  },
);

export const googleLogin = createAsyncThunk(
  "auth/googleLogin",
  async (credential: string, { rejectWithValue }) => {
    try {
      const { data } = await api.post<{ data: { user: AuthUser } }>(
        "/users/google-login",
        { credential },
      );
      return data.data.user;
    } catch (e) {
      return rejectWithValue(errorMessage(e));
    }
  },
);

export const registerUser = createAsyncThunk(
  "auth/register",
  async (formData: FormData, { rejectWithValue }) => {
    try {
      const { data } = await api.post<{ data: AuthUser }>(
        "/users/register",
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        },
      );
      return data.data;
    } catch (e) {
      return rejectWithValue(errorMessage(e));
    }
  },
);

export const logoutUser = createAsyncThunk("auth/logout", async () => {
  try {
    await api.post("/users/logout");
  } catch {
    /* still clear client state */
  }
});

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    clearAuthError(state) {
      state.error = null;
    },
    setUser(state, action: PayloadAction<AuthUser | null>) {
      state.user = action.payload;
    },
  },
  extraReducers(builder) {
    builder
      .addCase(hydrateAuth.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(hydrateAuth.fulfilled, (state, action) => {
        state.user = action.payload;
        state.initialized = true;
        state.status = "idle";
      })
      .addCase(hydrateAuth.rejected, (state) => {
        state.initialized = true; // 💣 IMPORTANT
        state.status = "idle";
      })
      .addCase(loginUser.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.user = action.payload;
        state.status = "idle";
        state.error = null;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.status = "idle";
        state.error =
          typeof action.payload === "string" ? action.payload : "Login failed";
      })
      .addCase(googleLogin.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(googleLogin.fulfilled, (state, action) => {
        state.user = action.payload;
        state.status = "idle";
        state.error = null;
      })
      .addCase(googleLogin.rejected, (state, action) => {
        state.status = "idle";
        state.error =
          typeof action.payload === "string" ? action.payload : "Google login failed";
      })
      .addCase(registerUser.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(registerUser.fulfilled, (state) => {
        /* Register API returns user but does not set auth cookies — session starts at login */
        state.status = "idle";
        state.error = null;
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.status = "idle";
        state.error =
          typeof action.payload === "string"
            ? action.payload
            : "Registration failed";
      })
      .addCase(logoutUser.fulfilled, (state) => {
        state.user = null;
        state.status = "idle";
        state.error = null;
      });
  },
});

export const { clearAuthError, setUser } = authSlice.actions;
export default authSlice.reducer;
