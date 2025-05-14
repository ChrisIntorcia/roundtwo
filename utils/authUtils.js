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
  
// List of common curse words to filter out
const CURSE_WORDS = [
  'fuck', 'shit', 'ass', 'bitch', 'cunt', 'dick', 'pussy', 'cock', 'tits', 'whore',
  'fucker', 'motherfucker', 'bullshit', 'dickhead', 'piss', 'damn', 'hell', 'crap',
  'bastard', 'slut', 'twat', 'wank', 'wanker', 'fag', 'faggot', 'nigger', 'nigga',
  'fck', 'sh1t', 'b1tch', 'd1ck', 'p0rn', 'pr0n', 'n1gga', 'n1gger', 'f4gg0t',
  // Add more variations and common curse words as needed
];

export const validateUsername = (username) => {
  // Check if username is empty
  if (!username || !username.trim()) {
    return {
      isValid: false,
      error: "Username cannot be empty"
    };
  }

  // Check if username contains spaces
  if (username.includes(' ')) {
    return {
      isValid: false,
      error: "Username must be a single word"
    };
  }

  // Check if username contains any curse words
  const lowerUsername = username.toLowerCase();
  for (const word of CURSE_WORDS) {
    if (lowerUsername.includes(word)) {
      return {
        isValid: false,
        error: "Username contains inappropriate language"
      };
    }
  }

  // Check if username contains only allowed characters
  const allowedPattern = /^[a-zA-Z0-9_.]+$/;
  if (!allowedPattern.test(username)) {
    return {
      isValid: false,
      error: "Username can only contain letters, numbers, dots, and underscores"
    };
  }

  // Check username length
  if (username.length < 3) {
    return {
      isValid: false,
      error: "Username must be at least 3 characters long"
    };
  }

  if (username.length > 30) {
    return {
      isValid: false,
      error: "Username must be less than 30 characters"
    };
  }

  return {
    isValid: true,
    error: null
  };
};
  