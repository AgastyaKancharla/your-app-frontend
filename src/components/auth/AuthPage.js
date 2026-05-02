import { useState } from "react";
import api from "../../config/axios";
import {
  COMPANY_NAME,
  COMPANY_PROBLEM_STATEMENT,
  COMPANY_TAGLINE
} from "../../branding";

const ENABLE_SUPER_ADMIN_LOGIN =
  String(process.env.REACT_APP_ENABLE_SUPER_ADMIN_LOGIN || "false").toLowerCase() ===
  "true";

const signupInitial = {
  restaurantName: "",
  businessType: "CLOUD_KITCHEN",
  name: "",
  email: "",
  phone: "",
  password: "",
  confirmPassword: ""
};

const loginInitial = {
  email: "",
  password: ""
};

const otpInitial = {
  code: "",
  challengeId: "",
  channel: "",
  destination: "",
  otpExpiresAt: "",
  developmentCode: "",
  deliveryDispatched: false
};

const verificationInitial = {
  code: "",
  email: "",
  channel: "",
  destination: "",
  verificationExpiresAt: "",
  developmentCode: "",
  deliveryDispatched: false
};

const superAdminInitial = {
  email: "",
  password: ""
};

const passwordRecoveryInitial = {
  identifier: "",
  code: "",
  challengeId: "",
  channel: "",
  destination: "",
  otpExpiresAt: "",
  developmentCode: "",
  deliveryDispatched: false,
  newPassword: "",
  confirmPassword: ""
};

const usernameRecoveryInitial = {
  identifier: "",
  code: "",
  challengeId: "",
  channel: "",
  destination: "",
  otpExpiresAt: "",
  developmentCode: "",
  deliveryDispatched: false,
  recoveredLoginEmail: "",
  recoveredName: ""
};

const feedbackInitial = {
  kind: "",
  text: ""
};

const OTP_DELIVERY_ERROR =
  "Verification code could not be delivered. Configure Resend email or Twilio SMS on the server.";
const EMAIL_DELIVERY_ERROR =
  "Verification code could not be delivered by email. Configure Resend email or an auth webhook on the server.";
const RECOVERY_DELIVERY_ERROR =
  "Recovery code could not be delivered. Configure Resend email or Twilio SMS on the server.";
const AUTH_REQUEST_CONFIG = {
  withCredentials: true,
  headers: {
    "Content-Type": "application/json"
  }
};

export default function AuthPage({
  onAuthSuccess,
  errorMessage = "",
  onClearError
}) {
  const [mode, setMode] = useState("login");
  const [loginForm, setLoginForm] = useState(loginInitial);
  const [otpState, setOtpState] = useState(otpInitial);
  const [verificationState, setVerificationState] = useState(verificationInitial);
  const [signupForm, setSignupForm] = useState(signupInitial);
  const [superAdminForm, setSuperAdminForm] = useState(superAdminInitial);
  const [passwordRecoveryState, setPasswordRecoveryState] = useState(passwordRecoveryInitial);
  const [usernameRecoveryState, setUsernameRecoveryState] = useState(usernameRecoveryInitial);
  const [feedback, setFeedback] = useState(feedbackInitial);
  const [submitting, setSubmitting] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [showSignupConfirmPassword, setShowSignupConfirmPassword] = useState(false);
  const [showRecoveryPassword, setShowRecoveryPassword] = useState(false);
  const [showRecoveryConfirmPassword, setShowRecoveryConfirmPassword] = useState(false);

  const clearFeedback = () => {
    onClearError?.();
    setFeedback(feedbackInitial);
  };

  const showFeedback = (kind, text) => {
    setFeedback({
      kind,
      text: String(text || "").trim()
    });
  };

  const showError = (text) => {
    showFeedback("error", text);
  };

  const showInfo = (text) => {
    showFeedback("info", text);
  };

  const clearOtpState = () => {
    setOtpState(otpInitial);
  };

  const clearVerificationState = () => {
    setVerificationState(verificationInitial);
  };

  const clearPasswordRecoveryState = () => {
    setPasswordRecoveryState(passwordRecoveryInitial);
    setShowRecoveryPassword(false);
    setShowRecoveryConfirmPassword(false);
  };

  const clearUsernameRecoveryState = () => {
    setUsernameRecoveryState(usernameRecoveryInitial);
  };

  const resetAuthFlows = () => {
    clearOtpState();
    clearVerificationState();
    clearPasswordRecoveryState();
    clearUsernameRecoveryState();
  };

  const switchMode = (nextMode) => {
    resetAuthFlows();
    clearFeedback();
    setMode(nextMode);
  };

  const renderPasswordField = ({
    name,
    value,
    placeholder,
    visible,
    onToggle,
    onChange,
    disabled = false
  }) => {
    return (
      <div style={inputWrap}>
        <input
          name={name}
          type={visible ? "text" : "password"}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          style={{ ...input, ...passwordInput }}
          disabled={disabled}
        />
        <button
          type="button"
          style={visibilityBtn}
          onClick={onToggle}
          disabled={disabled}
        >
          {visible ? "Hide" : "Show"}
        </button>
      </div>
    );
  };

  const updateLoginField = (event) => {
    const { name, value } = event.target;
    onClearError?.();
    setLoginForm((prev) => ({ ...prev, [name]: value }));
  };

  const updateOtpField = (event) => {
    const { name, value } = event.target;
    onClearError?.();
    setOtpState((prev) => ({ ...prev, [name]: value }));
  };

  const updateVerificationField = (event) => {
    const { name, value } = event.target;
    onClearError?.();
    setVerificationState((prev) => ({ ...prev, [name]: value }));
  };

  const updateSignupField = (event) => {
    const { name, value } = event.target;
    onClearError?.();
    setSignupForm((prev) => ({ ...prev, [name]: value }));
  };

  const updateSuperAdminField = (event) => {
    const { name, value } = event.target;
    onClearError?.();
    setSuperAdminForm((prev) => ({ ...prev, [name]: value }));
  };

  const updatePasswordRecoveryField = (event) => {
    const { name, value } = event.target;
    onClearError?.();
    setPasswordRecoveryState((prev) => ({ ...prev, [name]: value }));
  };

  const updateUsernameRecoveryField = (event) => {
    const { name, value } = event.target;
    onClearError?.();
    setUsernameRecoveryState((prev) => ({ ...prev, [name]: value }));
  };

  const getDeliveryMessage = (message, fallback, deliveryErrorMessage, delivery) => {
    if (delivery?.dispatched === false) {
      return deliveryErrorMessage;
    }

    return String(message || fallback || "").trim();
  };

  const getDevelopmentCodeMessage = (label, code) => {
    const normalizedCode = String(code || "").trim();
    if (!normalizedCode) {
      return "";
    }

    return `${label} delivery is not configured on this machine. Development-only code: ${normalizedCode}`;
  };

  const startOtpFlow = ({ email, password, responseData }) => {
    const developmentCode = String(responseData?.otpCode || "").trim();

    if (responseData?.delivery?.dispatched === false && !developmentCode) {
      clearOtpState();
      showError(OTP_DELIVERY_ERROR);
      return;
    }

    clearVerificationState();
    setOtpState({
      code: "",
      challengeId: responseData?.challengeId || "",
      channel:
        responseData?.delivery?.dispatched === false && developmentCode
          ? "development"
          : responseData?.channel || "",
      destination:
        responseData?.delivery?.dispatched === false && developmentCode
          ? ""
          : responseData?.destination || "",
      otpExpiresAt: responseData?.otpExpiresAt || "",
      developmentCode,
      deliveryDispatched: Boolean(responseData?.delivery?.dispatched)
    });
    setLoginForm({
      email,
      password
    });
    showInfo(
      responseData?.delivery?.dispatched === false && developmentCode
        ? getDevelopmentCodeMessage("OTP", developmentCode)
        : getDeliveryMessage(
            responseData?.message,
            "Verification code sent. Enter it below to continue.",
            OTP_DELIVERY_ERROR,
            responseData?.delivery
          )
    );
  };

  const startVerificationFlow = ({ email, responseData, fallbackMessage }) => {
    const normalizedEmail = String(email || "").trim().toLowerCase();
    const developmentCode = String(responseData?.verificationToken || "").trim();

    if (responseData?.delivery?.dispatched === false && !developmentCode) {
      clearVerificationState();
      setLoginForm((prev) => ({
        ...prev,
        email: normalizedEmail,
        password: ""
      }));
      setMode("login");
      showError(EMAIL_DELIVERY_ERROR);
      return;
    }

    clearOtpState();
    setVerificationState({
      code: "",
      email: normalizedEmail,
      channel:
        responseData?.delivery?.dispatched === false && developmentCode
          ? "development"
          : responseData?.delivery?.channel || "email",
      destination:
        responseData?.delivery?.dispatched === false && developmentCode
          ? ""
          : responseData?.delivery?.destination || "",
      verificationExpiresAt: responseData?.verificationExpiresAt || "",
      developmentCode,
      deliveryDispatched: Boolean(responseData?.delivery?.dispatched)
    });
    setLoginForm((prev) => ({
      ...prev,
      email: normalizedEmail,
      password: ""
    }));
    setMode("login");
    showInfo(
      responseData?.delivery?.dispatched === false && developmentCode
        ? getDevelopmentCodeMessage("Email verification", developmentCode)
        : getDeliveryMessage(
            responseData?.message,
            fallbackMessage,
            EMAIL_DELIVERY_ERROR,
            responseData?.delivery
          )
    );
  };

  const buildRecoveryState = (responseData) => {
    const developmentCode = String(responseData?.otpCode || "").trim();

    return {
      code: "",
      challengeId: responseData?.challengeId || "",
      channel:
        responseData?.delivery?.dispatched === false && developmentCode
          ? "development"
          : responseData?.channel || "",
      destination:
        responseData?.delivery?.dispatched === false && developmentCode
          ? ""
          : responseData?.destination || "",
      otpExpiresAt: responseData?.otpExpiresAt || "",
      developmentCode,
      deliveryDispatched: Boolean(responseData?.delivery?.dispatched)
    };
  };

  const startPasswordRecoveryFlow = ({ identifier, responseData }) => {
    const nextState = buildRecoveryState(responseData);
    if (responseData?.delivery?.dispatched === false && !nextState.developmentCode) {
      clearPasswordRecoveryState();
      showError(RECOVERY_DELIVERY_ERROR);
      return;
    }

    setPasswordRecoveryState((prev) => ({
      ...passwordRecoveryInitial,
      identifier,
      ...nextState,
      newPassword: prev.newPassword,
      confirmPassword: prev.confirmPassword
    }));
    showInfo(
      nextState.developmentCode
        ? getDevelopmentCodeMessage("Recovery OTP", nextState.developmentCode)
        : getDeliveryMessage(
            responseData?.message,
            "Recovery code sent. Enter it below to reset your password.",
            RECOVERY_DELIVERY_ERROR,
            responseData?.delivery
          )
    );
  };

  const startUsernameRecoveryFlow = ({ identifier, responseData }) => {
    const nextState = buildRecoveryState(responseData);
    if (responseData?.delivery?.dispatched === false && !nextState.developmentCode) {
      clearUsernameRecoveryState();
      showError(RECOVERY_DELIVERY_ERROR);
      return;
    }

    setUsernameRecoveryState((prev) => ({
      ...usernameRecoveryInitial,
      identifier,
      ...nextState,
      recoveredLoginEmail: prev.recoveredLoginEmail,
      recoveredName: prev.recoveredName
    }));
    showInfo(
      nextState.developmentCode
        ? getDevelopmentCodeMessage("Recovery OTP", nextState.developmentCode)
        : getDeliveryMessage(
            responseData?.message,
            "Recovery code sent. Enter it below to recover your login email.",
            RECOVERY_DELIVERY_ERROR,
            responseData?.delivery
          )
    );
  };

  const clearPendingLoginFlow = () => {
    clearOtpState();
    clearVerificationState();
    clearFeedback();
    setLoginForm((prev) => ({
      ...prev,
      password: ""
    }));
  };

  const submitLogin = async () => {
    const email = loginForm.email.trim().toLowerCase();
    const password = loginForm.password;

    if (!email || !password) {
      showError("Email and password are required");
      return;
    }

    setSubmitting(true);
    clearFeedback();

    try {
      const response = await api.post(
        "/api/auth/login",
        {
          email,
          password
        },
        AUTH_REQUEST_CONFIG
      );
      console.log(response.data);

      if (response.data?.otpRequired) {
        startOtpFlow({
          email,
          password,
          responseData: response.data
        });
        return;
      }

      if (!response.data?.success) {
        showError(response.data?.message || "Unable to login");
        return;
      }

      onAuthSuccess?.({
        token: response.data?.token,
        refreshToken: response.data?.refreshToken,
        user: response.data?.user
      });

      setLoginForm(loginInitial);
      resetAuthFlows();
      clearFeedback();
    } catch (err) {
      console.error(err);
      if (err.response?.data?.verificationRequired) {
        startVerificationFlow({
          email,
          responseData: err.response?.data,
          fallbackMessage: "Email verification is pending. Enter your verification code below."
        });
        return;
      }

      if (!err.response) {
        showError(
          `Cannot reach auth server at ${process.env.REACT_APP_API_URL}. Set REACT_APP_API_URL correctly.`
        );
        return;
      }

      showError(err.response?.data?.message || "Unable to login");
    } finally {
      setSubmitting(false);
    }
  };

  const submitLoginOtpVerification = async () => {
    const email = loginForm.email.trim().toLowerCase();
    const code = otpState.code.trim();

    if (!email || !code) {
      showError("Email and verification code are required");
      return;
    }

    setSubmitting(true);
    clearFeedback();

    try {
      const res = await api.post(
        "/api/auth/verify-login-otp",
        {
          email,
          code,
          challengeId: otpState.challengeId
        },
        AUTH_REQUEST_CONFIG
      );

      onAuthSuccess?.({
        token: res.data?.token,
        refreshToken: res.data?.refreshToken,
        user: res.data?.user
      });

      setLoginForm(loginInitial);
      resetAuthFlows();
      clearFeedback();
    } catch (err) {
      console.error(err);
      showError(err.response?.data?.message || "Unable to verify login code");
    } finally {
      setSubmitting(false);
    }
  };

  const submitEmailVerification = async () => {
    const email = verificationState.email.trim().toLowerCase();
    const code = verificationState.code.trim();

    if (!email || !code) {
      showError("Email and verification code are required");
      return;
    }

    setSubmitting(true);
    clearFeedback();

    try {
      const res = await api.post(
        "/api/auth/verify-email",
        {
          email,
          code
        },
        AUTH_REQUEST_CONFIG
      );

      onAuthSuccess?.({
        token: res.data?.token,
        refreshToken: res.data?.refreshToken,
        user: res.data?.user
      });

      setLoginForm(loginInitial);
      resetAuthFlows();
      clearFeedback();
    } catch (err) {
      console.error(err);
      showError(err.response?.data?.message || "Unable to verify email");
    } finally {
      setSubmitting(false);
    }
  };

  const resendLoginOtp = async () => {
    const email = loginForm.email.trim().toLowerCase();
    const password = loginForm.password;

    if (!email || !password) {
      showError("Enter email and password to resend verification code");
      return;
    }

    setSubmitting(true);
    clearFeedback();

    try {
      const res = await api.post(
        "/api/auth/login",
        {
          email,
          password
        },
        AUTH_REQUEST_CONFIG
      );

      if (res.data?.otpRequired) {
        startOtpFlow({
          email,
          password,
          responseData: res.data
        });
        return;
      }

      onAuthSuccess?.({
        token: res.data?.token,
        refreshToken: res.data?.refreshToken,
        user: res.data?.user
      });
      resetAuthFlows();
      clearFeedback();
    } catch (err) {
      console.error(err);
      showError(err.response?.data?.message || "Unable to resend verification code");
    } finally {
      setSubmitting(false);
    }
  };

  const submitSignup = async () => {
    const restaurantName = signupForm.restaurantName.trim();
    const businessType = String(signupForm.businessType || "").trim().toUpperCase();
    const name = signupForm.name.trim();
    const email = signupForm.email.trim().toLowerCase();
    const phone = signupForm.phone.trim();
    const password = signupForm.password;
    const confirmPassword = signupForm.confirmPassword;

    if (!restaurantName || !businessType || !name || !email || !password) {
      showError("Workspace name, business type, owner name, email and password are required");
      return;
    }

    if (password.length < 6) {
      showError("Password must be at least 6 characters");
      return;
    }

    if (password !== confirmPassword) {
      showError("Password and confirm password do not match");
      return;
    }

    setSubmitting(true);
    clearFeedback();

    try {
      const res = await api.post(
        "/api/auth/signup",
        JSON.stringify({
          restaurantName,
          businessType,
          name,
          email,
          phone,
          password
        }),
        AUTH_REQUEST_CONFIG
      );

      if (res.data?.verificationRequired) {
        setSignupForm(signupInitial);
        startVerificationFlow({
          email: res.data?.email || email,
          responseData: res.data,
          fallbackMessage: "Account created. Enter the verification code sent to your email."
        });
        return;
      }

      onAuthSuccess?.({
        token: res.data?.token,
        refreshToken: res.data?.refreshToken,
        user: res.data?.user
      });

      setSignupForm(signupInitial);
      resetAuthFlows();
      clearFeedback();
    } catch (err) {
      console.error(err);
      showError(err.response?.data?.message || "Unable to create account");
    } finally {
      setSubmitting(false);
    }
  };

  const requestPasswordResetCode = async () => {
    const identifier = passwordRecoveryState.identifier.trim();

    if (!identifier) {
      showError("Enter your registered email or phone number");
      return;
    }

    setSubmitting(true);
    clearFeedback();

    try {
      const res = await api.post(
        "/api/auth/forgot-password/request",
        {
          identifier
        },
        AUTH_REQUEST_CONFIG
      );

      if (res.data?.recoveryRequired) {
        startPasswordRecoveryFlow({
          identifier,
          responseData: res.data,
        });
        return;
      }

      showInfo(res.data?.message || "Recovery code sent.");
    } catch (err) {
      console.error(err);
      showError(err.response?.data?.message || "Unable to send recovery code");
    } finally {
      setSubmitting(false);
    }
  };

  const submitPasswordReset = async () => {
    const identifier = passwordRecoveryState.identifier.trim();
    const code = passwordRecoveryState.code.trim();
    const newPassword = passwordRecoveryState.newPassword;
    const confirmPassword = passwordRecoveryState.confirmPassword;

    if (!identifier || !code || !newPassword || !confirmPassword) {
      showError("Enter your email or phone number, code, and new password");
      return;
    }

    if (newPassword.length < 6) {
      showError("Password must be at least 6 characters");
      return;
    }

    if (newPassword !== confirmPassword) {
      showError("Password and confirm password do not match");
      return;
    }

    setSubmitting(true);
    clearFeedback();

    try {
      const res = await api.post(
        "/api/auth/forgot-password/verify",
        {
          identifier,
          code,
          challengeId: passwordRecoveryState.challengeId,
          newPassword,
          confirmPassword
        },
        AUTH_REQUEST_CONFIG
      );

      switchMode("login");
      setLoginForm({
        email: res.data?.loginEmail || (identifier.includes("@") ? identifier.toLowerCase() : ""),
        password: ""
      });
      showFeedback(
        "success",
        res.data?.message || "Password reset successful. You can login with your new password."
      );
    } catch (err) {
      console.error(err);
      showError(err.response?.data?.message || "Unable to reset password");
    } finally {
      setSubmitting(false);
    }
  };

  const requestUsernameRecoveryCode = async () => {
    const identifier = usernameRecoveryState.identifier.trim();

    if (!identifier) {
      showError("Enter your registered email or phone number");
      return;
    }

    setSubmitting(true);
    clearFeedback();

    try {
      const res = await api.post(
        "/api/auth/forgot-username/request",
        {
          identifier
        },
        AUTH_REQUEST_CONFIG
      );

      if (res.data?.recoveryRequired) {
        startUsernameRecoveryFlow({
          identifier,
          responseData: res.data
        });
        return;
      }

      showInfo(res.data?.message || "Recovery code sent.");
    } catch (err) {
      console.error(err);
      showError(err.response?.data?.message || "Unable to send recovery code");
    } finally {
      setSubmitting(false);
    }
  };

  const submitUsernameRecovery = async () => {
    const identifier = usernameRecoveryState.identifier.trim();
    const code = usernameRecoveryState.code.trim();

    if (!identifier || !code) {
      showError("Enter your email or phone number and recovery code");
      return;
    }

    setSubmitting(true);
    clearFeedback();

    try {
      const res = await api.post(
        "/api/auth/forgot-username/verify",
        {
          identifier,
          code,
          challengeId: usernameRecoveryState.challengeId
        },
        AUTH_REQUEST_CONFIG
      );

      switchMode("login");
      setLoginForm({
        email: res.data?.loginEmail || "",
        password: ""
      });
      showFeedback(
        "success",
        res.data?.loginEmail
          ? `Your login email is ${res.data.loginEmail}.`
          : (res.data?.message || "Username recovered successfully.")
      );
    } catch (err) {
      console.error(err);
      showError(err.response?.data?.message || "Unable to recover username");
    } finally {
      setSubmitting(false);
    }
  };

  const submitSuperAdminLogin = async () => {
    const email = superAdminForm.email.trim().toLowerCase();
    const password = superAdminForm.password;

    if (!email || !password) {
      showError("Email and password are required");
      return;
    }

    setSubmitting(true);
    clearFeedback();

    try {
      const res = await api.post(
        "/api/auth/super-admin/login",
        {
          email,
          password
        },
        AUTH_REQUEST_CONFIG
      );

      onAuthSuccess?.({
        token: res.data?.token,
        refreshToken: res.data?.refreshToken,
        user: res.data?.user
      });
      setSuperAdminForm(superAdminInitial);
      clearFeedback();
    } catch (err) {
      console.error(err);
      showError(err.response?.data?.message || "Unable to login as super admin");
    } finally {
      setSubmitting(false);
    }
  };

  const feedbackStyle =
    feedback.kind === "error"
      ? errorBox
      : feedback.kind === "success"
        ? successBox
        : infoBox;

  return (
    <div style={authPage}>
      <div style={authShell}>
        <div style={brandPanel}>
          <div style={brandChip}>WELCOME TO</div>
          <h1 style={brandTitle}>{COMPANY_NAME}</h1>
          <p style={brandTagline}>{COMPANY_TAGLINE}</p>
          <p style={brandDescription}>{COMPANY_PROBLEM_STATEMENT}</p>
          <div style={brandFooterText}>
            One place for onboarding, operations, billing visibility, and team productivity.
          </div>
        </div>

        <div style={authCard}>
          <div
            style={{
              ...tabRow,
              gridTemplateColumns: ENABLE_SUPER_ADMIN_LOGIN
                ? "1fr 1fr 1fr"
                : "1fr 1fr"
            }}
          >
            <button
              style={{
                ...tabBtn,
                ...(["login", "forgot_password", "forgot_username"].includes(mode)
                  ? tabBtnActive
                  : {})
              }}
              onClick={() => switchMode("login")}
            >
              Login
            </button>
            <button
              style={{ ...tabBtn, ...(mode === "signup" ? tabBtnActive : {}) }}
              onClick={() => switchMode("signup")}
            >
              Create Account
            </button>
            {ENABLE_SUPER_ADMIN_LOGIN ? (
              <button
                style={{ ...tabBtn, ...(mode === "super_admin" ? tabBtnActive : {}) }}
                onClick={() => switchMode("super_admin")}
              >
                Super Admin
              </button>
            ) : null}
          </div>

          <h2 style={title}>
            {mode === "signup"
              ? `Create ${COMPANY_NAME} Account`
              : mode === "super_admin"
                ? `${COMPANY_NAME} Super Admin`
                : mode === "forgot_password"
                  ? `Reset ${COMPANY_NAME} Password`
                  : mode === "forgot_username"
                    ? `Recover ${COMPANY_NAME} Login`
                    : `${COMPANY_NAME} Login`}
          </h2>
          <p style={subtitle}>
            {mode === "super_admin"
              ? "Login with platform-level super admin credentials."
              : mode === "signup"
                ? `Create your restaurant workspace on ${COMPANY_NAME}.`
                : mode === "forgot_password"
                  ? "Enter your registered email or phone number to receive a recovery code."
                  : mode === "forgot_username"
                    ? "Recover your login email using your registered email or phone number."
                    : mode === "login"
                ? `Sign in to your ${COMPANY_NAME} workspace.`
                : ""}
          </p>

          {errorMessage ? <div style={errorBox}>{errorMessage}</div> : null}
          {feedback.text ? <div style={feedbackStyle}>{feedback.text}</div> : null}

          {mode === "login" ? (
            <div style={formGrid}>
              <input
                name="email"
                type="email"
                placeholder="Email"
                value={loginForm.email}
                onChange={updateLoginField}
                style={input}
                disabled={
                  submitting ||
                  Boolean(otpState.challengeId) ||
                  Boolean(verificationState.email)
                }
              />
              {verificationState.email ? (
                <>
                  <input
                    name="code"
                    placeholder="6-digit email verification code"
                    value={verificationState.code}
                    onChange={updateVerificationField}
                    style={input}
                  />
                  <div style={hintBox}>
                    {verificationState.deliveryDispatched
                      ? `Verification code sent via ${verificationState.channel || "email"}${verificationState.destination ? ` to ${verificationState.destination}` : ""}.`
                      : verificationState.developmentCode
                        ? `Development-only verification code: ${verificationState.developmentCode}`
                        : "Verification delivery is unavailable right now."}
                  </div>
                  <button
                    style={submitBtn}
                    onClick={submitEmailVerification}
                    disabled={submitting}
                  >
                    {submitting ? "Please wait..." : "Verify Email"}
                  </button>
                  <button
                    style={altBtn}
                    onClick={clearPendingLoginFlow}
                    disabled={submitting}
                  >
                    Use different account
                  </button>
                </>
              ) : otpState.challengeId ? (
                <>
                  <input
                    name="code"
                    placeholder="6-digit verification code"
                    value={otpState.code}
                    onChange={updateOtpField}
                    style={input}
                  />
                  <div style={hintBox}>
                    {otpState.deliveryDispatched
                      ? `Code sent via ${otpState.channel || "email"}${otpState.destination ? ` to ${otpState.destination}` : ""}.`
                      : otpState.developmentCode
                        ? `Development-only login code: ${otpState.developmentCode}`
                        : "Verification delivery is unavailable right now."}
                  </div>
                  <button
                    style={submitBtn}
                    onClick={submitLoginOtpVerification}
                    disabled={submitting}
                  >
                    {submitting ? "Please wait..." : "Verify and Login"}
                  </button>
                  <button style={altBtn} onClick={resendLoginOtp} disabled={submitting}>
                    Resend code
                  </button>
                  <button
                    style={altBtn}
                    onClick={clearPendingLoginFlow}
                    disabled={submitting}
                  >
                    Use different account
                  </button>
                </>
              ) : (
                <>
                  {renderPasswordField({
                    name: "password",
                    value: loginForm.password,
                    placeholder: "Password",
                    visible: showLoginPassword,
                    onToggle: () => setShowLoginPassword((prev) => !prev),
                    onChange: updateLoginField
                  })}
                  <button style={submitBtn} onClick={submitLogin} disabled={submitting}>
                    {submitting ? "Please wait..." : "Login"}
                  </button>
                  <button
                    style={altBtn}
                    onClick={() => switchMode("signup")}
                    disabled={submitting}
                  >
                    Create account
                  </button>
                  <div style={linkRow}>
                    <button
                      type="button"
                      style={linkBtn}
                      onClick={() => switchMode("forgot_password")}
                      disabled={submitting}
                    >
                      Forgot password?
                    </button>
                    <button
                      type="button"
                      style={linkBtn}
                      onClick={() => switchMode("forgot_username")}
                      disabled={submitting}
                    >
                      Forgot username?
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : mode === "signup" ? (
            <div style={formGrid}>
              <input
                name="restaurantName"
                placeholder="Outlet / Restaurant Name"
                value={signupForm.restaurantName}
                onChange={updateSignupField}
                style={input}
              />
              <select
                name="businessType"
                value={signupForm.businessType}
                onChange={updateSignupField}
                style={input}
              >
                <option value="CLOUD_KITCHEN">Cloud Kitchen</option>
                <option value="RESTAURANT">Restaurant</option>
              </select>
              <input
                name="name"
                placeholder="Owner Name"
                value={signupForm.name}
                onChange={updateSignupField}
                style={input}
              />
              <input
                name="email"
                type="email"
                placeholder="Email"
                value={signupForm.email}
                onChange={updateSignupField}
                style={input}
              />
              <input
                name="phone"
                placeholder="Phone"
                value={signupForm.phone}
                onChange={updateSignupField}
                style={input}
              />
              {renderPasswordField({
                name: "password",
                value: signupForm.password,
                placeholder: "Password",
                visible: showSignupPassword,
                onToggle: () => setShowSignupPassword((prev) => !prev),
                onChange: updateSignupField
              })}
              {renderPasswordField({
                name: "confirmPassword",
                value: signupForm.confirmPassword,
                placeholder: "Confirm Password",
                visible: showSignupConfirmPassword,
                onToggle: () => setShowSignupConfirmPassword((prev) => !prev),
                onChange: updateSignupField
              })}
              <button style={submitBtn} onClick={submitSignup} disabled={submitting}>
                {submitting ? "Please wait..." : "Create Account"}
              </button>
              <button
                style={altBtn}
                onClick={() => switchMode("login")}
                disabled={submitting}
              >
                Back to login
              </button>
            </div>
          ) : mode === "forgot_password" ? (
            <div style={formGrid}>
              <input
                name="identifier"
                placeholder="Registered email or phone number"
                value={passwordRecoveryState.identifier}
                onChange={updatePasswordRecoveryField}
                style={input}
                disabled={submitting || Boolean(passwordRecoveryState.challengeId)}
              />
              {passwordRecoveryState.challengeId ? (
                <>
                  <input
                    name="code"
                    placeholder="6-digit recovery code"
                    value={passwordRecoveryState.code}
                    onChange={updatePasswordRecoveryField}
                    style={input}
                    disabled={submitting}
                  />
                  <div style={hintBox}>
                    {passwordRecoveryState.deliveryDispatched
                      ? `Recovery code sent via ${passwordRecoveryState.channel || "email"}${passwordRecoveryState.destination ? ` to ${passwordRecoveryState.destination}` : ""}.`
                      : passwordRecoveryState.developmentCode
                        ? `Development-only recovery code: ${passwordRecoveryState.developmentCode}`
                        : "Recovery delivery is unavailable right now."}
                  </div>
                  {renderPasswordField({
                    name: "newPassword",
                    value: passwordRecoveryState.newPassword,
                    placeholder: "New Password",
                    visible: showRecoveryPassword,
                    onToggle: () => setShowRecoveryPassword((prev) => !prev),
                    onChange: updatePasswordRecoveryField,
                    disabled: submitting
                  })}
                  {renderPasswordField({
                    name: "confirmPassword",
                    value: passwordRecoveryState.confirmPassword,
                    placeholder: "Confirm New Password",
                    visible: showRecoveryConfirmPassword,
                    onToggle: () => setShowRecoveryConfirmPassword((prev) => !prev),
                    onChange: updatePasswordRecoveryField,
                    disabled: submitting
                  })}
                  <button
                    style={submitBtn}
                    onClick={submitPasswordReset}
                    disabled={submitting}
                  >
                    {submitting ? "Please wait..." : "Reset Password"}
                  </button>
                </>
              ) : (
                <button
                  style={submitBtn}
                  onClick={requestPasswordResetCode}
                  disabled={submitting}
                >
                  {submitting ? "Please wait..." : "Send Recovery Code"}
                </button>
              )}
              <button
                style={altBtn}
                onClick={() => switchMode("login")}
                disabled={submitting}
              >
                Back to login
              </button>
            </div>
          ) : mode === "forgot_username" ? (
            <div style={formGrid}>
              <input
                name="identifier"
                placeholder="Registered email or phone number"
                value={usernameRecoveryState.identifier}
                onChange={updateUsernameRecoveryField}
                style={input}
                disabled={submitting || Boolean(usernameRecoveryState.challengeId)}
              />
              {usernameRecoveryState.challengeId ? (
                <>
                  <input
                    name="code"
                    placeholder="6-digit recovery code"
                    value={usernameRecoveryState.code}
                    onChange={updateUsernameRecoveryField}
                    style={input}
                    disabled={submitting}
                  />
                  <div style={hintBox}>
                    {usernameRecoveryState.deliveryDispatched
                      ? `Recovery code sent via ${usernameRecoveryState.channel || "email"}${usernameRecoveryState.destination ? ` to ${usernameRecoveryState.destination}` : ""}.`
                      : usernameRecoveryState.developmentCode
                        ? `Development-only recovery code: ${usernameRecoveryState.developmentCode}`
                        : "Recovery delivery is unavailable right now."}
                  </div>
                  <button
                    style={submitBtn}
                    onClick={submitUsernameRecovery}
                    disabled={submitting}
                  >
                    {submitting ? "Please wait..." : "Recover Login Email"}
                  </button>
                </>
              ) : (
                <button
                  style={submitBtn}
                  onClick={requestUsernameRecoveryCode}
                  disabled={submitting}
                >
                  {submitting ? "Please wait..." : "Send Recovery Code"}
                </button>
              )}
              <button
                style={altBtn}
                onClick={() => switchMode("login")}
                disabled={submitting}
              >
                Back to login
              </button>
            </div>
          ) : (
            <div style={formGrid}>
              <input
                name="email"
                type="email"
                placeholder="Super Admin Email"
                value={superAdminForm.email}
                onChange={updateSuperAdminField}
                style={input}
              />
              <input
                name="password"
                type="password"
                placeholder="Super Admin Password"
                value={superAdminForm.password}
                onChange={updateSuperAdminField}
                style={input}
              />
              <button style={submitBtn} onClick={submitSuperAdminLogin} disabled={submitting}>
                {submitting ? "Please wait..." : "Login as Super Admin"}
              </button>
              <button
                style={altBtn}
                onClick={() => switchMode("login")}
                disabled={submitting}
              >
                Back to login
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const authPage = {
  minHeight: "100vh",
  display: "grid",
  placeItems: "center",
  width: "100%",
  padding: "24px 16px",
  background:
    "radial-gradient(circle at 8% 0%, rgba(244,201,58,0.23) 0%, rgba(21,24,33,0) 42%), radial-gradient(circle at 100% 100%, rgba(56,201,143,0.2) 0%, rgba(21,24,33,0) 44%), linear-gradient(120deg, #0b0f1d 0%, #0a1022 48%, #071919 100%)"
};

const authShell = {
  width: "min(1160px, 100%)",
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
  gap: 28,
  alignItems: "stretch"
};

const brandPanel = {
  minHeight: 0,
  padding: "12px 8px",
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
  maxWidth: 560
};

const brandChip = {
  alignSelf: "flex-start",
  height: 30,
  borderRadius: 999,
  border: "1px solid rgba(244,201,58,0.45)",
  background: "rgba(244,201,58,0.18)",
  color: "#f4c93a",
  fontWeight: 800,
  fontSize: 11,
  letterSpacing: 1.2,
  padding: "0 12px",
  display: "grid",
  placeItems: "center"
};

const brandTitle = {
  margin: "14px 0 6px",
  color: "#f3f6fc",
  fontSize: 48,
  lineHeight: 1.05,
  letterSpacing: 0.2
};

const brandTagline = {
  margin: "0 0 14px",
  color: "#f4c93a",
  fontSize: 14,
  letterSpacing: 0.6,
  textTransform: "uppercase",
  fontWeight: 700
};

const brandDescription = {
  margin: 0,
  color: "#cad3e8",
  fontSize: 15,
  lineHeight: 1.65,
  maxWidth: 520
};

const brandFooterText = {
  marginTop: 18,
  color: "#a8b4ce",
  fontSize: 12.5
};

const authCard = {
  width: "min(520px, 100%)",
  justifySelf: "center",
  borderRadius: 18,
  background: "linear-gradient(180deg, #171b26 0%, #11141c 100%)",
  border: "1px solid #2f3444",
  boxShadow: "0 30px 80px rgba(0,0,0,0.48)",
  padding: 22
};

const tabRow = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 8,
  marginBottom: 18,
  background: "rgba(10,13,19,0.8)",
  border: "1px solid #2e3445",
  borderRadius: 12,
  padding: 6
};

const tabBtn = {
  height: 36,
  borderRadius: 8,
  border: "1px solid transparent",
  background: "transparent",
  color: "#ccd3e6",
  fontWeight: 700,
  cursor: "pointer"
};

const tabBtnActive = {
  borderColor: "#f4c93a",
  background: "rgba(244,201,58,0.18)",
  color: "#f4c93a"
};

const title = {
  margin: "0 0 6px",
  color: "#f3f6fc",
  fontSize: 27,
  letterSpacing: 0.2
};

const subtitle = {
  margin: "0 0 16px",
  color: "#9ca5bd",
  fontSize: 13.5
};

const errorBox = {
  marginBottom: 10,
  border: "1px solid #62414a",
  background: "rgba(175,77,102,0.16)",
  color: "#ffd7e0",
  borderRadius: 8,
  padding: "8px 10px",
  fontSize: 13
};

const infoBox = {
  marginBottom: 10,
  border: "1px solid #4b556d",
  background: "rgba(86,107,149,0.16)",
  color: "#dbe8ff",
  borderRadius: 8,
  padding: "8px 10px",
  fontSize: 13,
  lineHeight: 1.5
};

const successBox = {
  marginBottom: 10,
  border: "1px solid #355649",
  background: "rgba(56,201,143,0.16)",
  color: "#d9ffee",
  borderRadius: 8,
  padding: "8px 10px",
  fontSize: 13
};

const hintBox = {
  border: "1px solid #3d4356",
  background: "rgba(61,67,86,0.2)",
  color: "#d5ddf0",
  borderRadius: 8,
  padding: "8px 10px",
  fontSize: 12
};

const formGrid = {
  display: "grid",
  gap: 12
};

const inputWrap = {
  position: "relative"
};

const input = {
  height: 42,
  borderRadius: 10,
  border: "1px solid #3b4155",
  background: "#0e1118",
  color: "#edf1fb",
  outline: 0,
  padding: "0 12px"
};

const passwordInput = {
  width: "100%",
  paddingRight: 72
};

const visibilityBtn = {
  position: "absolute",
  top: 6,
  right: 6,
  height: 30,
  minWidth: 56,
  borderRadius: 8,
  border: "1px solid #3d4358",
  background: "#1b202d",
  color: "#d8e0f2",
  fontWeight: 700,
  cursor: "pointer"
};

const submitBtn = {
  height: 40,
  border: 0,
  borderRadius: 10,
  background: "linear-gradient(135deg, #f4c93a, #f39a2e)",
  color: "#2d2103",
  fontWeight: 800,
  cursor: "pointer"
};

const altBtn = {
  height: 36,
  borderRadius: 10,
  border: "1px solid #3d4358",
  background: "#1b202d",
  color: "#d8e0f2",
  fontWeight: 600,
  cursor: "pointer"
};

const linkRow = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  flexWrap: "wrap"
};

const linkBtn = {
  border: 0,
  padding: 0,
  background: "transparent",
  color: "#f4c93a",
  fontSize: 13,
  fontWeight: 700,
  cursor: "pointer"
};
