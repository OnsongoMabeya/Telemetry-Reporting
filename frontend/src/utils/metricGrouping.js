/**
 * Metric Grouping Utility
 * Shared logic for grouping metrics by view settings (merged vs individual)
 * Used by MySites.js and ServicePDFReport.js
 */

/**
 * Group metrics by merge groups based on view settings
 * @param {Array} metrics - Array of metric objects with viewSetting property
 * @param {Object} viewSettings - Object mapping metric IDs to view settings
 * @returns {Object} { groups: {groupId: {groupId, groupName, metrics}}, individual: [...] }
 */
export const groupMetricsByView = (metrics, viewSettings = {}) => {
  const groups = {};
  const individual = [];

  if (!metrics || metrics.length === 0) {
    return { groups, individual };
  }

  metrics.forEach(metric => {
    const viewSetting = viewSettings[metric.metric_mapping_id || metric.id];

    if (viewSetting?.view_type === 'merged' && viewSetting.merge_group_id) {
      const groupId = viewSetting.merge_group_id;
      const groupName = viewSetting.merge_group_name || 'Merged Metrics';

      if (!groups[groupId]) {
        groups[groupId] = {
          groupId,
          groupName,
          metrics: []
        };
      }
      groups[groupId].metrics.push(metric);
    } else {
      individual.push(metric);
    }
  });

  return { groups, individual };
};

/**
 * Calculate max value for a metric (used for sorting)
 * @param {Object} metric - Metric with data array
 * @param {string} dataKey - Key to access values in data points
 * @returns {number} Maximum value or 0
 */
export const getMetricMaxValue = (metric, dataKey) => {
  if (!metric.data || metric.data.length === 0) return 0;
  const values = metric.data
    .map(item => {
      const val = item[dataKey] ?? item.value;
      return Number(val);
    })
    .filter(v => !isNaN(v));
  return values.length > 0 ? Math.max(...values) : 0;
};

/**
 * Sort metrics by max value (descending) for proper layering
 * Largest values first so they render at back
 * @param {Array} metrics - Array of metrics
 * @param {string} dataKey - Key to access values
 * @returns {Array} Sorted metrics with maxValue property added
 */
export const sortMetricsByMaxValue = (metrics, dataKey) => {
  return [...metrics].map(metric => ({
    ...metric,
    maxValue: getMetricMaxValue(metric, dataKey)
  })).sort((a, b) => b.maxValue - a.maxValue);
};
