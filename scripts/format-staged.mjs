import lintStaged from 'lint-staged';

try {
  const success = await lintStaged();
  if (!success) {
    process.exit(1);
  }
} catch (error) {
  console.error(error);
  process.exit(1);
}
