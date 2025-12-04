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

    // Count factors of 2
    while (n % 2 === 0) {
      count++;
      n = n / 2;
    }
    
    // Count odd factors
    for (let i = 3; i * i <= n; i += 2) {
      while (n % i === 0) {
        count++;
        n = n / i;
      }
    }
    
    // If n > 2, remaining n is prime (e.g. the last factor)
    if (n > 2) {
      count++;
    }
    
    return count;
};