// src/core/gameLogic.js
export const checkContractCompletion = (contract, runStats, inventory) => {
  if (!contract) return false;

  switch (contract.type) {
    case 'mining':
      // Did we collect enough of the specific material in this run?
      // runStats.collectedMaterials is a map { 'sin30': 2, ... }
      const count = runStats.collectedMaterials?.[contract.targetMaterial] || 0;
      return count >= contract.requiredCount;
      
    case 'travel':
      // Did we arrive at the destination?
      // The MapMode ensures we only warp to the correct ID or similar
      // runStats.destinationId should match
      return runStats.destinationId === contract.destinationId;

    case 'craft':
      // This is checked in the station, not the runner.
      // If we have the item in inventory, it is complete.
      return (inventory[contract.targetItem] || 0) >= contract.requiredCount;

    default:
      return false;
  }
};

export const calculateRewards = (contract) => {
  if (!contract) return { credits: 0, reputation: {} };

  return {
    credits: contract.rewardCredits,
    reputation: contract.rewardRep
  };
};