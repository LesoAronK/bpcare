-- PostgreSQL schema for a production BPCare backend
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE TABLE users(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),email text UNIQUE NOT NULL,password_hash text NOT NULL, -- argon2/bcrypt, never plaintext
 role text NOT NULL CHECK(role IN('patient','doctor','admin')),created_at timestamptz DEFAULT now(),deleted_at timestamptz);
CREATE TABLE patient_profiles(user_id uuid PRIMARY KEY REFERENCES users ON DELETE CASCADE,full_name text NOT NULL,age int CHECK(age BETWEEN 1 AND 120),gender text,phone_enc bytea, -- encrypted
 photo_url text,measurement_arm text,thr_systolic int DEFAULT 140,thr_diastolic int DEFAULT 90,reminder_time time);
CREATE TABLE doctor_profiles(user_id uuid PRIMARY KEY REFERENCES users ON DELETE CASCADE,full_name text NOT NULL,license_no text,clinic text);
CREATE TABLE bp_devices(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),patient_id uuid NOT NULL REFERENCES users ON DELETE CASCADE,name text,model text,connection text CHECK(connection IN('bluetooth','wifi')),status text DEFAULT 'disconnected',last_sync_at timestamptz);
CREATE TABLE bp_measurements(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),patient_id uuid NOT NULL REFERENCES users ON DELETE CASCADE,device_id uuid REFERENCES bp_devices,
 systolic int NOT NULL CHECK(systolic BETWEEN 60 AND 260),diastolic int NOT NULL CHECK(diastolic BETWEEN 30 AND 160),pulse int NOT NULL CHECK(pulse BETWEEN 30 AND 220),
 measured_at timestamptz NOT NULL,source text NOT NULL CHECK(source IN('automatic','manual')),is_sample boolean DEFAULT false,notes text,created_at timestamptz DEFAULT now(),
 UNIQUE(patient_id,device_id,measured_at)); -- prevents duplicate uploads
CREATE INDEX ON bp_measurements(patient_id,measured_at DESC);
CREATE TABLE measurement_notes(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),measurement_id uuid REFERENCES bp_measurements ON DELETE CASCADE,author_id uuid REFERENCES users,body text NOT NULL,created_at timestamptz DEFAULT now());
CREATE TABLE notifications(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid REFERENCES users ON DELETE CASCADE,type text,message text,is_read boolean DEFAULT false,created_at timestamptz DEFAULT now());
CREATE TABLE patient_doctor_permissions(patient_id uuid REFERENCES users ON DELETE CASCADE,doctor_id uuid REFERENCES users ON DELETE CASCADE,granted_at timestamptz DEFAULT now(),revoked_at timestamptz,PRIMARY KEY(patient_id,doctor_id));
CREATE TABLE reports(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),patient_id uuid REFERENCES users ON DELETE CASCADE,period text CHECK(period IN('daily','weekly','monthly','yearly')),range_start date,range_end date,file_url text,created_at timestamptz DEFAULT now());
CREATE TABLE consents(user_id uuid REFERENCES users ON DELETE CASCADE,purpose text,granted boolean,at timestamptz DEFAULT now());
CREATE TABLE audit_logs(id bigserial PRIMARY KEY,actor_id uuid,patient_id uuid,action text,at timestamptz DEFAULT now(),ip inet);
