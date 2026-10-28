import { QueryTypes } from 'sequelize';
import { sequelize } from '../../core/db';

/** Database figures for the settings screen (v1 database stats). */
export const databaseStats = async () => {
  const [r] = await sequelize.query<{
    size_bytes: string;
    tables: string;
    records: string | null;
    started_at: Date;
    connections: string;
  }>(
    `SELECT pg_database_size(current_database()) AS size_bytes,
            (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE') AS tables,
            (SELECT SUM(n_live_tup) FROM pg_stat_user_tables) AS records,
            pg_postmaster_start_time() AS started_at,
            (SELECT COUNT(*) FROM pg_stat_activity WHERE datname = current_database()) AS connections`,
    { type: QueryTypes.SELECT }
  );
  return {
    sizeBytes: Number(r?.size_bytes ?? 0),
    tables: Number(r?.tables ?? 0),
    records: Number(r?.records ?? 0),
    startedAt: r?.started_at ? new Date(r.started_at).toISOString() : null,
    connections: Number(r?.connections ?? 0),
  };
};
