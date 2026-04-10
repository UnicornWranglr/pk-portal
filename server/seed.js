const bcrypt = require('bcrypt');
const pool = require('./db/pool');

async function seed() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Admin user (password: admin123)
    const adminHash = await bcrypt.hash('admin123', 10);
    await client.query(
      `INSERT INTO admin_users (name, email, password_hash) VALUES ($1, $2, $3)
       ON CONFLICT (email) DO NOTHING`,
      ['Admin', 'admin@peakprocessing.com', adminHash]
    );

    // Billing config defaults
    const { rowCount } = await client.query('SELECT 1 FROM billing_config LIMIT 1');
    if (rowCount === 0) {
      await client.query(
        `INSERT INTO billing_config
         (standard_daily, standard_monthly, kingdom_addon_daily, kingdom_addon_monthly, gpu_daily, gpu_monthly, setup_fee, fair_use_threshold_days)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [15.00, 150.00, 10.00, 100.00, 25.00, 250.00, 50.00, 10]
      );
    }

    // Sample clients
    const { rows: [client1] } = await client.query(
      `INSERT INTO clients (name, contact_email, billing_contact)
       VALUES ('Acme Energy', 'contact@acme-energy.com', 'billing@acme-energy.com')
       RETURNING id`
    );
    const { rows: [client2] } = await client.query(
      `INSERT INTO clients (name, contact_email, billing_contact)
       VALUES ('GeoSurvey Ltd', 'info@geosurvey.co.uk', 'accounts@geosurvey.co.uk')
       RETURNING id`
    );

    // Client portal users (password: client123)
    const clientHash = await bcrypt.hash('client123', 10);
    await client.query(
      `INSERT INTO client_users (client_id, name, email, password_hash) VALUES ($1,$2,$3,$4)
       ON CONFLICT (email) DO NOTHING`,
      [client1.id, 'Jane Smith', 'jane@acme-energy.com', clientHash]
    );
    await client.query(
      `INSERT INTO client_users (client_id, name, email, password_hash) VALUES ($1,$2,$3,$4)
       ON CONFLICT (email) DO NOTHING`,
      [client2.id, 'Tom Brown', 'tom@geosurvey.co.uk', clientHash]
    );

    // Sample seat users — standard/gpu only, kingdom_license as boolean flag
    await client.query(
      `INSERT INTO users (client_id, display_name, email, user_type, status, added_date, setup_fee_charged, kingdom_license)
       VALUES ($1,'Alice Johnson','alice@acme-energy.com','standard','active','2025-01-15',true,false),
              ($1,'Bob Lee','bob@acme-energy.com','standard','active','2025-02-01',true,true),
              ($1,'Carol Davis','carol@acme-energy.com','gpu','active','2025-03-10',false,true)`,
      [client1.id]
    );
    await client.query(
      `INSERT INTO users (client_id, display_name, email, user_type, status, added_date, setup_fee_charged, kingdom_license)
       VALUES ($1,'Dave Wilson','dave@geosurvey.co.uk','standard','active','2025-01-01',true,false),
              ($1,'Eve Martin','eve@geosurvey.co.uk','standard','active','2025-02-15',true,true)`,
      [client2.id]
    );

    await client.query('COMMIT');
    console.log('Seed data inserted successfully.');
    console.log('Admin login: admin@peakprocessing.com / admin123');
    console.log('Client logins: jane@acme-energy.com / client123, tom@geosurvey.co.uk / client123');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Seed failed:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
