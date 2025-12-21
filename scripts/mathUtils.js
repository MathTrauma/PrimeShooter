
export const isPrime = (num) => {
  if (num <= 1) return false;
  if (num <= 3) return true;
  if (num % 2 === 0 || num % 3 === 0) return false;

  for (let i = 5; i * i <= num; i += 6) {
    if (num % i === 0 || num % (i + 2) === 0) return false;
  }
  return true;
};

export const isForbiddenTarget = (num) => {
  // 1. Is Prime
  if (isPrime(num)) return true;
  
  // 2. Is Prime * 2
  if (num % 2 === 0) {
    const half = num / 2;
    if (isPrime(half)) return true;
  }

  return false;
};

export const generateTargetNumber = () => {
  // Generate 3-digit natural number (100 - 999)
  return Math.floor(Math.random() * 900) + 100;
};

export const getPrimeFactorCount = (num) => {
    let count = 0;
    let n = num;

    // Handle edge cases
    if (n <= 1) return 1;

    // Count if 2 is a factor (only count once)
    if (n % 2 === 0) {
      count++;
      while (n % 2 === 0) {
        n = n / 2;
      }
    }

    // Count distinct odd factors
    for (let i = 3; i * i <= n; i += 2) {
      if (n % i === 0) {
        count++;
        while (n % i === 0) {
          n = n / i;
        }
      }
    }

    // If n > 2, remaining n is prime (e.g. the last distinct factor)
    if (n > 2) {
      count++;
    }

    return count;
};