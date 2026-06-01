const fs = require('fs');
const path = require('path');
const db = require('../db');
const config = require('../config');
const { resolveAsset } = require('./generators');
const { NODE_TYPES } = require('./generators/types');

function parseNode(row) {
  if (!row) return null;
  return {
    ...row,
    asset_spec: JSON.parse(row.asset_spec),
  };
}

async function enrichNode(node) {
  const parsed = parseNode(node);
  const asset = await resolveAsset(parsed.asset_spec);
  const choices = db.prepare(`
    SELECT c.*, n.label as target_label, n.node_type as target_node_type
    FROM branch_choice c
    JOIN branch_node n ON n.id = c.to_node_id
    WHERE c.from_node_id = ?
    ORDER BY c.sort_order ASC, c.id ASC
  `).all(node.id);

  const enrichedChoices = await Promise.all(choices.map(async (c) => {
    const targetNode = db.prepare('SELECT * FROM branch_node WHERE id = ?').get(c.to_node_id);
    const targetAsset = targetNode
      ? await resolveAsset(JSON.parse(targetNode.asset_spec))
      : null;
    return {
      id: c.id,
      option_label: c.option_label,
      option_desc: c.option_desc,
      to_node_id: c.to_node_id,
      target_label: c.target_label,
      target_node_type: c.target_node_type,
      preview: targetAsset,
    };
  }));

  return {
    ...parsed,
    asset,
    choices: enrichedChoices,
    is_branch_point: enrichedChoices.length > 0,
    is_ending: parsed.node_type === NODE_TYPES.ENDING || enrichedChoices.length === 0,
  };
}

class BranchService {
  listPublished() {
    return db.prepare(`
      SELECT d.*,
        (SELECT COUNT(*) FROM branch_node n WHERE n.demo_id = d.id) as node_count,
        s.title as series_title
      FROM branch_demo d
      LEFT JOIN series s ON s.id = d.series_id
      WHERE d.status = 1
      ORDER BY d.updated_at DESC, d.id DESC
    `).all();
  }

  listAll() {
    return db.prepare(`
      SELECT d.*,
        (SELECT COUNT(*) FROM branch_node n WHERE n.demo_id = d.id) as node_count,
        s.title as series_title
      FROM branch_demo d
      LEFT JOIN series s ON s.id = d.series_id
      ORDER BY d.updated_at DESC, d.id DESC
    `).all();
  }

  getDemoById(id) {
    return db.prepare(`
      SELECT d.*, s.title as series_title
      FROM branch_demo d
      LEFT JOIN series s ON s.id = d.series_id
      WHERE d.id = ?
    `).get(id);
  }

  async getDemoEntry(id) {
    const demo = this.getDemoById(id);
    if (!demo || demo.status !== 1) return null;
    if (!demo.root_node_id) return { demo, node: null };

    const node = db.prepare('SELECT * FROM branch_node WHERE id = ?').get(demo.root_node_id);
    return {
      demo,
      node: await enrichNode(node),
    };
  }

  async getNodeDetail(nodeId) {
    const node = db.prepare('SELECT * FROM branch_node WHERE id = ?').get(nodeId);
    if (!node) return null;
    return enrichNode(node);
  }

  async choose({ demoId, fromNodeId, choiceId, userSessionId }) {
    const choice = db.prepare(`
      SELECT * FROM branch_choice
      WHERE id = ? AND demo_id = ? AND from_node_id = ?
    `).get(choiceId, demoId, fromNodeId);

    if (!choice) {
      throw new Error('无效的分支选项');
    }

    db.prepare(`
      INSERT INTO branch_user_path (demo_id, user_session_id, choice_id, from_node_id, to_node_id)
      VALUES (?, ?, ?, ?, ?)
    `).run(demoId, userSessionId, choiceId, fromNodeId, choice.to_node_id);

    const nextNode = db.prepare('SELECT * FROM branch_node WHERE id = ?').get(choice.to_node_id);
    return {
      choice: {
        id: choice.id,
        option_label: choice.option_label,
        option_desc: choice.option_desc,
      },
      node: await enrichNode(nextNode),
    };
  }

  getDemoStats(demoId) {
    const choices = db.prepare(`
      SELECT c.id, c.option_label, COUNT(p.id) as pick_count
      FROM branch_choice c
      LEFT JOIN branch_user_path p ON p.choice_id = c.id
      WHERE c.demo_id = ?
      GROUP BY c.id
      ORDER BY c.sort_order ASC
    `).all(demoId);

    const total = choices.reduce((sum, c) => sum + c.pick_count, 0);
    return {
      total,
      choices: choices.map((c) => ({
        ...c,
        percentage: total > 0 ? Math.round((c.pick_count / total) * 100) : 0,
      })),
    };
  }

  /** 管理端：读取 demo 完整树 */
  async getDemoTree(demoId) {
    const demo = this.getDemoById(demoId);
    if (!demo) return null;

    const nodes = db.prepare('SELECT * FROM branch_node WHERE demo_id = ? ORDER BY id ASC').all(demoId);
    const choices = db.prepare('SELECT * FROM branch_choice WHERE demo_id = ? ORDER BY sort_order ASC').all(demoId);

    const enrichedNodes = await Promise.all(nodes.map(async (n) => ({
      ...parseNode(n),
      asset: await resolveAsset(n.asset_spec),
    })));

    return { demo, nodes: enrichedNodes, choices };
  }

  ensureAssetDirs() {
    const branchAssetService = require('./branchAssetService');
    branchAssetService.ensureDirs();
    return path.join(config.uploadBasePath, 'branches');
  }

  getNodeById(nodeId) {
    const node = db.prepare('SELECT * FROM branch_node WHERE id = ?').get(nodeId);
    return node ? parseNode(node) : null;
  }

  updateNode(nodeId, { label, node_type, branch_at, asset_spec }) {
    const node = db.prepare('SELECT * FROM branch_node WHERE id = ?').get(nodeId);
    if (!node) return null;

    const currentSpec = JSON.parse(node.asset_spec);
    const nextSpec = asset_spec ? { ...currentSpec, ...asset_spec, type: asset_spec.type || currentSpec.type } : currentSpec;

    db.prepare(`
      UPDATE branch_node SET
        label = COALESCE(?, label),
        node_type = COALESCE(?, node_type),
        branch_at = COALESCE(?, branch_at),
        asset_spec = ?
      WHERE id = ?
    `).run(
      label ?? null,
      node_type ?? null,
      branch_at ?? null,
      JSON.stringify(nextSpec),
      nodeId,
    );

    db.prepare('UPDATE branch_demo SET updated_at = datetime(\'now\') WHERE id = ?').run(node.demo_id);
    return this.getNodeById(nodeId);
  }

  applyUploadedAssets(nodeId, files) {
    const node = this.getNodeById(nodeId);
    if (!node) return null;

    const branchAssetService = require('./branchAssetService');
    const spec = { ...node.asset_spec };

    if (files.video_file?.[0]) {
      spec.video_url = branchAssetService.saveUploadedFile(files.video_file[0], 'branches/uploads');
      spec.type = 'video';
      spec.generator = spec.generator || 'static';
    }
    if (files.image_file?.[0]) {
      spec.image_url = branchAssetService.saveUploadedFile(files.image_file[0], 'branches/uploads');
      if (!spec.type) spec.type = 'composite';
    }
    if (files.audio_file?.[0]) {
      spec.audio_url = branchAssetService.saveUploadedFile(files.audio_file[0], 'branches/uploads');
      spec.provider = 'file';
      if (!spec.type) spec.type = 'composite';
    }

    return this.updateNode(nodeId, { asset_spec: spec });
  }

  async prewarmDemoAssets(demoId) {
    const nodes = db.prepare('SELECT * FROM branch_node WHERE demo_id = ?').all(demoId);
    for (const node of nodes) {
      try {
        await resolveAsset(node.asset_spec);
      } catch (err) {
        console.warn(`[branch] 预热节点 #${node.id} 失败:`, err.message);
      }
    }
  }
}

module.exports = new BranchService();
