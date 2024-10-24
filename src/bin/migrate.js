#!/usr/bin/env node

const fetch = require('node-fetch');
const Mapeo = require('../mapeo');
const { Command } = require('commander');

/**
 * Updates the category IDs of observations based on the provided categories.
 *
 * This function fetches observations for specified categories from the endpoint,
 * and updates their category ID to the new category. If --dry is passed, it only
 * simulates the update without making actual changes.
 *
 * @param {Array} categoriesToFetch - An array of category IDs to fetch and update observations for.
 * @param {string} newCategory - The new category ID to update observations to.
 * @param {boolean} isDryRun - Whether to perform a dry run without making actual changes.
 *
 * Logs the result of each update attempt, a summary of changes, and a message upon completion,
 * or logs an error if any occurs during the process.
 */
async function updateCategories(categoriesToFetch, newCategory, isDryRun) {
  console.log('Starting migration process...');
  const changes = [];

  try {
    console.log(`Fetching observations for categories: ${categoriesToFetch.join(', ')}`);

    // Fetch observations for specified categories
    const queryParams = new URLSearchParams(categoriesToFetch.map(cat => ['category', cat]));
    const response = await fetch(`http://localhost:3000/mapeo?${queryParams}`);

    const observations = await response.json();

    console.log(`Fetched ${observations.length} observations.`);

    // Update observations
    for (const observation of observations) {
      const currentCategoryId = observation.tags.categoryId;

      // Only process observations within the specified categories
      if (categoriesToFetch.includes(currentCategoryId)) {
        console.log(`Processing observation ${observation.id} with current category: ${currentCategoryId}`);

        console.log(`Updating category for observation ${observation.id}: ${currentCategoryId} -> ${newCategory}`);

        // Prepare the update payload
        const updatePayload = {
          observationId: observation.id,
          observationVersion: observation.version,
          nodeHostname: observation.tags.hostname || '',
          nodeModel: newCategory
        };

        if (!isDryRun) {
          let updateSuccessful = false;
          let retries = 0;
          const maxRetries = 3;

          while (!updateSuccessful && retries < maxRetries) {
            try {
              // Send PUT request to update the observation
              const updateResponse = await fetch('http://localhost:3000/mapeo', {
                method: 'PUT',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(updatePayload),
              });

              if (updateResponse.ok) {
                console.log(`Successfully updated observation ${observation.id}`);
                updateSuccessful = true;
              } else {
                throw new Error(`Failed to update observation ${observation.id}`);
              }
            } catch (error) {
              console.error(`Attempt ${retries + 1} failed: ${error.message}`);
              retries++;
              if (retries < maxRetries) {
                console.log(`Retrying update for observation ${observation.id}...`);
              } else {
                throw new Error(`Max retries reached for observation ${observation.id}. Moving to next observation.`);
              }
            }
          }
        } else {
          console.log(`Dry run: Would update observation ${observation.id}`);
        }
        changes.push({ id: observation.id, from: currentCategoryId, to: newCategory });
      } else {
        console.log(`Skipping observation ${observation.id} with category: ${currentCategoryId} (not in target categories)`);
      }
    }

    console.log(isDryRun ? 'Dry run completed' : 'Migration completed');
    console.log('Summary of changes:');
    console.table(changes);
  } catch (error) {
    console.error('Error during migration:', error);
  }
}

const program = new Command();

program
  .name('mapeo-migrate')
  .description('Migrate Mapeo categories')
  .version('1.0.0')
  .requiredOption('-f, --from <categories>', 'Categories to fetch (comma-separated)')
  .requiredOption('-t, --to <category>', 'New category to migrate to')
  .option('-d, --dry-run', 'Perform a dry run without making actual changes')
  .option('-k, --key <project-key>', 'Mapeo project key')
  .addHelpText('after', `
Example:
  $ mapeo-migrate --from category1,category2 --to newCategory --key yourProjectKey
  $ mapeo-migrate -f category1,category2 -t newCategory -k yourProjectKey --dry-run`)
  .parse(process.argv);

const options = program.opts();

const projectKey = options.key || process.env.MAPEO_PROJECT_KEY;

if (!projectKey) {
  console.error('Error: Project key must be provided either as --key option or MAPEO_PROJECT_KEY environment variable');
  process.exit(1);
}

(async () => {
  try {
    const categoriesToFetch = options.from.split(',').map(cat => cat.trim());
    const newCategory = options.to;
    const isDryRun = options.dryRun || false;

    console.log('Categories to fetch:', categoriesToFetch);
    console.log('New category:', newCategory);
    if (isDryRun) console.log('Dry run mode: No actual updates will be made');

    const mapeoInstance = new Mapeo({});
    mapeoInstance.get(projectKey);

    // Wait for 5 seconds to allow the API to start
    await new Promise(resolve => setTimeout(resolve, 5000));

    await updateCategories(categoriesToFetch, newCategory, isDryRun, mapeoInstance);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
})();
