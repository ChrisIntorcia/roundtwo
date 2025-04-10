export const getFriendlyError = (code) => {
    switch (code) {
      case "auth/invalid-email":
        return "The email address is not valid.";
      case "auth/user-disabled":
        return "This account has been disabled.";
      case "auth/user-not-found":
        return "No account found with this email.";
      case "auth/wrong-password":
        return "Incorrect password.";
      case "auth/email-already-in-use":
        return "An account already exists with this email.";
      case "auth/weak-password":
        return "Your password is too weak. Please use at least 6 characters.";
      case "auth/missing-email":
        return "Please enter an email address.";
      default:
        return "Something went wrong. Please try again.";
    }
  };
  