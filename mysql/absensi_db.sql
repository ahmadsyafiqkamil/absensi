-- phpMyAdmin SQL Dump
-- version 5.2.2
-- https://www.phpmyadmin.net/
--
-- Host: mysql:3306
-- Generation Time: Sep 05, 2025 at 05:29 AM
-- Server version: 8.0.43
-- PHP Version: 8.2.27

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `absensi_db`
--

-- --------------------------------------------------------

--
-- Table structure for table `api_attendance`
--

CREATE TABLE `api_attendance` (
  `id` bigint NOT NULL,
  `date_local` date NOT NULL,
  `timezone` varchar(64) NOT NULL,
  `check_in_at_utc` datetime(6) DEFAULT NULL,
  `check_in_lat` decimal(10,7) DEFAULT NULL,
  `check_in_lng` decimal(10,7) DEFAULT NULL,
  `check_in_accuracy_m` int UNSIGNED DEFAULT NULL,
  `check_out_at_utc` datetime(6) DEFAULT NULL,
  `check_out_lat` decimal(10,7) DEFAULT NULL,
  `check_out_lng` decimal(10,7) DEFAULT NULL,
  `check_out_accuracy_m` int UNSIGNED DEFAULT NULL,
  `is_holiday` tinyint(1) NOT NULL,
  `within_geofence` tinyint(1) NOT NULL,
  `minutes_late` int NOT NULL,
  `total_work_minutes` int NOT NULL,
  `note` varchar(200) DEFAULT NULL,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  `employee_id` bigint DEFAULT NULL,
  `user_id` int NOT NULL,
  `employee_note` longtext,
  `overtime_minutes` int UNSIGNED NOT NULL,
  `overtime_amount` decimal(12,2) NOT NULL,
  `overtime_approved` tinyint(1) NOT NULL,
  `overtime_approved_by_id` int DEFAULT NULL,
  `overtime_approved_at` datetime(6) DEFAULT NULL,
  `check_in_ip` char(39) DEFAULT NULL,
  `check_out_ip` char(39) DEFAULT NULL
) ;

--
-- Dumping data for table `api_attendance`
--

INSERT INTO `api_attendance` (`id`, `date_local`, `timezone`, `check_in_at_utc`, `check_in_lat`, `check_in_lng`, `check_in_accuracy_m`, `check_out_at_utc`, `check_out_lat`, `check_out_lng`, `check_out_accuracy_m`, `is_holiday`, `within_geofence`, `minutes_late`, `total_work_minutes`, `note`, `created_at`, `updated_at`, `employee_id`, `user_id`, `employee_note`, `overtime_minutes`, `overtime_amount`, `overtime_approved`, `overtime_approved_by_id`, `overtime_approved_at`, `check_in_ip`, `check_out_ip`) VALUES
(1, '2025-09-05', 'Asia/Dubai', '2025-09-05 03:13:10.991796', -6.3797800, 106.8805600, 35, NULL, NULL, NULL, NULL, 0, 1, 0, 0, NULL, '2025-09-05 03:12:35.462595', '2025-09-05 03:13:10.995570', 6, 3, NULL, 0, 0.00, 0, NULL, NULL, 'unknown', NULL),
(2, '2025-08-19', 'Asia/Dubai', '2025-08-19 03:28:00.000000', NULL, NULL, NULL, '2025-08-19 17:28:00.000000', NULL, NULL, NULL, 0, 0, 0, 840, NULL, '2025-09-05 03:34:37.142452', '2025-09-05 03:34:37.150594', 6, 3, '[Correction]: tes perbaikan', 300, 852.27, 0, NULL, NULL, NULL, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `api_attendancecorrection`
--

CREATE TABLE `api_attendancecorrection` (
  `id` bigint NOT NULL,
  `date_local` date NOT NULL,
  `type` varchar(32) NOT NULL,
  `proposed_check_in_local` datetime(6) DEFAULT NULL,
  `proposed_check_out_local` datetime(6) DEFAULT NULL,
  `reason` longtext NOT NULL,
  `status` varchar(16) NOT NULL,
  `reviewed_at` datetime(6) DEFAULT NULL,
  `decision_note` longtext,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  `reviewed_by_id` int DEFAULT NULL,
  `user_id` int NOT NULL,
  `attachment` varchar(100) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `api_attendancecorrection`
--

INSERT INTO `api_attendancecorrection` (`id`, `date_local`, `type`, `proposed_check_in_local`, `proposed_check_out_local`, `reason`, `status`, `reviewed_at`, `decision_note`, `created_at`, `updated_at`, `reviewed_by_id`, `user_id`, `attachment`) VALUES
(1, '2025-08-19', 'edit', '2025-08-19 07:28:00.000000', '2025-08-19 21:28:00.000000', 'tes perbaikan', 'approved', '2025-09-05 03:34:37.154320', 'Disetujui', '2025-09-05 03:28:45.305232', '2025-09-05 03:28:45.305248', 6, 3, 'corrections/Screenshot_2025-09-03_at_10.41.18.png');

-- --------------------------------------------------------

--
-- Table structure for table `api_division`
--

CREATE TABLE `api_division` (
  `id` bigint NOT NULL,
  `name` varchar(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `api_division`
--

INSERT INTO `api_division` (`id`, `name`) VALUES
(2, 'Komunikasi'),
(1, 'Konsuler');

-- --------------------------------------------------------

--
-- Table structure for table `api_employee`
--

CREATE TABLE `api_employee` (
  `id` bigint NOT NULL,
  `nip` varchar(32) NOT NULL,
  `division_id` bigint DEFAULT NULL,
  `user_id` int NOT NULL,
  `position_id` bigint DEFAULT NULL,
  `gaji_pokok` decimal(12,2) DEFAULT NULL,
  `tanggal_lahir` date DEFAULT NULL,
  `tempat_lahir` varchar(100) DEFAULT NULL,
  `tmt_kerja` date DEFAULT NULL,
  `fullname` longtext
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `api_employee`
--

INSERT INTO `api_employee` (`id`, `nip`, `division_id`, `user_id`, `position_id`, `gaji_pokok`, `tanggal_lahir`, `tempat_lahir`, `tmt_kerja`, `fullname`) VALUES
(1, '12345', NULL, 4, NULL, NULL, NULL, NULL, NULL, 'Test User'),
(3, '123456', NULL, 5, NULL, NULL, NULL, NULL, NULL, 'Test User 2'),
(4, 'KONS001', 1, 6, 1, 6000.00, NULL, NULL, NULL, 'Konsuler 1'),
(5, 'PPK001', 2, 7, 3, 10000.00, NULL, NULL, NULL, 'Pejabat Pembuat Komitmen'),
(6, 'STK001', 1, 3, 2, 60000.00, NULL, NULL, NULL, 'Staff Konsuler 1');

-- --------------------------------------------------------

--
-- Table structure for table `api_grouppermission`
--

CREATE TABLE `api_grouppermission` (
  `id` bigint NOT NULL,
  `permission_type` varchar(30) NOT NULL,
  `permission_action` varchar(20) NOT NULL,
  `is_active` tinyint(1) NOT NULL,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  `group_id` int NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `api_grouppermissiontemplate`
--

CREATE TABLE `api_grouppermissiontemplate` (
  `id` bigint NOT NULL,
  `name` varchar(100) NOT NULL,
  `description` longtext NOT NULL,
  `permissions` json NOT NULL,
  `is_active` tinyint(1) NOT NULL,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `api_holiday`
--

CREATE TABLE `api_holiday` (
  `id` bigint NOT NULL,
  `date` date NOT NULL,
  `note` varchar(200) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `api_monthlysummaryrequest`
--

CREATE TABLE `api_monthlysummaryrequest` (
  `id` bigint NOT NULL,
  `request_period` varchar(7) NOT NULL,
  `report_type` varchar(20) NOT NULL,
  `request_title` varchar(200) DEFAULT NULL,
  `request_description` longtext,
  `include_attendance` tinyint(1) NOT NULL,
  `include_overtime` tinyint(1) NOT NULL,
  `include_corrections` tinyint(1) NOT NULL,
  `include_summary_stats` tinyint(1) NOT NULL,
  `priority` varchar(20) NOT NULL,
  `expected_completion_date` date DEFAULT NULL,
  `status` varchar(20) NOT NULL,
  `level1_approved_at` datetime(6) DEFAULT NULL,
  `final_approved_at` datetime(6) DEFAULT NULL,
  `rejection_reason` longtext,
  `completed_at` datetime(6) DEFAULT NULL,
  `completion_notes` longtext,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  `employee_id` bigint NOT NULL,
  `final_approved_by_id` int DEFAULT NULL,
  `level1_approved_by_id` int DEFAULT NULL,
  `user_id` int NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `api_overtimedocument`
--

CREATE TABLE `api_overtimedocument` (
  `id` bigint NOT NULL,
  `docx_file` varchar(100) NOT NULL,
  `pdf_file` varchar(100) DEFAULT NULL,
  `document_type` varchar(20) NOT NULL,
  `status` varchar(20) NOT NULL,
  `error_message` longtext,
  `created_at` datetime(6) NOT NULL,
  `converted_at` datetime(6) DEFAULT NULL,
  `downloaded_at` datetime(6) DEFAULT NULL,
  `overtime_request_id` bigint NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `api_overtimerequest`
--

CREATE TABLE `api_overtimerequest` (
  `id` bigint NOT NULL,
  `date_requested` date NOT NULL,
  `overtime_hours` decimal(4,2) NOT NULL,
  `work_description` longtext NOT NULL,
  `status` varchar(20) NOT NULL,
  `approved_at` datetime(6) DEFAULT NULL,
  `rejection_reason` longtext,
  `overtime_amount` decimal(12,2) NOT NULL,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  `approved_by_id` int DEFAULT NULL,
  `employee_id` bigint NOT NULL,
  `user_id` int NOT NULL,
  `final_approved_at` datetime(6) DEFAULT NULL,
  `final_approved_by_id` int DEFAULT NULL,
  `level1_approved_at` datetime(6) DEFAULT NULL,
  `level1_approved_by_id` int DEFAULT NULL,
  `final_rejected_at` datetime(6) DEFAULT NULL,
  `final_rejected_by_id` int DEFAULT NULL,
  `level1_rejected_at` datetime(6) DEFAULT NULL,
  `level1_rejected_by_id` int DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `api_overtimerequest`
--

INSERT INTO `api_overtimerequest` (`id`, `date_requested`, `overtime_hours`, `work_description`, `status`, `approved_at`, `rejection_reason`, `overtime_amount`, `created_at`, `updated_at`, `approved_by_id`, `employee_id`, `user_id`, `final_approved_at`, `final_approved_by_id`, `level1_approved_at`, `level1_approved_by_id`, `final_rejected_at`, `final_rejected_by_id`, `level1_rejected_at`, `level1_rejected_by_id`) VALUES
(1, '2025-08-19', 5.00, 'Lembur pada Selasa, 19 Agustus 2025 - Bekerja 14j (lebih 5j dari jam kerja normal)', 'approved', '2025-09-05 03:38:45.462691', NULL, 852.27, '2025-09-05 03:35:04.536444', '2025-09-05 03:38:45.463707', 7, 6, 3, '2025-09-05 03:38:45.462683', 7, '2025-09-05 03:35:22.182668', 6, NULL, NULL, NULL, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `api_position`
--

CREATE TABLE `api_position` (
  `id` bigint NOT NULL,
  `name` varchar(100) NOT NULL,
  `approval_level` smallint UNSIGNED NOT NULL,
  `can_approve_overtime_org_wide` tinyint(1) NOT NULL
) ;

--
-- Dumping data for table `api_position`
--

INSERT INTO `api_position` (`id`, `name`, `approval_level`, `can_approve_overtime_org_wide`) VALUES
(1, 'Home staff', 1, 0),
(2, 'Local Staff', 0, 0),
(3, 'Pengelola Keuangan', 2, 1),
(4, 'Kepala Perwakilan RI', 2, 1);

-- --------------------------------------------------------

--
-- Table structure for table `api_worksettings`
--

CREATE TABLE `api_worksettings` (
  `id` bigint NOT NULL,
  `timezone` varchar(64) NOT NULL,
  `start_time` time(6) NOT NULL,
  `end_time` time(6) NOT NULL,
  `required_minutes` int UNSIGNED NOT NULL,
  `grace_minutes` int UNSIGNED NOT NULL,
  `workdays` json NOT NULL,
  `office_latitude` decimal(10,7) DEFAULT NULL,
  `office_longitude` decimal(10,7) DEFAULT NULL,
  `office_radius_meters` int UNSIGNED NOT NULL,
  `friday_end_time` time(6) NOT NULL,
  `friday_grace_minutes` int UNSIGNED NOT NULL,
  `friday_required_minutes` int UNSIGNED NOT NULL,
  `friday_start_time` time(6) NOT NULL,
  `overtime_rate_workday` decimal(5,2) NOT NULL,
  `overtime_rate_holiday` decimal(5,2) NOT NULL,
  `overtime_threshold_minutes` int UNSIGNED NOT NULL,
  `earliest_check_in_enabled` tinyint(1) NOT NULL,
  `earliest_check_in_time` time(6) NOT NULL,
  `latest_check_out_enabled` tinyint(1) NOT NULL,
  `latest_check_out_time` time(6) NOT NULL
) ;

--
-- Dumping data for table `api_worksettings`
--

INSERT INTO `api_worksettings` (`id`, `timezone`, `start_time`, `end_time`, `required_minutes`, `grace_minutes`, `workdays`, `office_latitude`, `office_longitude`, `office_radius_meters`, `friday_end_time`, `friday_grace_minutes`, `friday_required_minutes`, `friday_start_time`, `overtime_rate_workday`, `overtime_rate_holiday`, `overtime_threshold_minutes`, `earliest_check_in_enabled`, `earliest_check_in_time`, `latest_check_out_enabled`, `latest_check_out_time`) VALUES
(1, 'Asia/Dubai', '09:00:00.000000', '17:00:00.000000', 480, 0, '[0, 1, 2, 3, 4]', -6.3798953, 106.8805959, 100, '13:00:00.000000', 0, 240, '09:00:00.000000', 0.50, 0.75, 60, 1, '06:00:00.000000', 1, '22:00:00.000000');

-- --------------------------------------------------------

--
-- Table structure for table `auth_group`
--

CREATE TABLE `auth_group` (
  `id` int NOT NULL,
  `name` varchar(150) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `auth_group`
--

INSERT INTO `auth_group` (`id`, `name`) VALUES
(1, 'admin'),
(3, 'pegawai'),
(2, 'supervisor');

-- --------------------------------------------------------

--
-- Table structure for table `auth_group_permissions`
--

CREATE TABLE `auth_group_permissions` (
  `id` bigint NOT NULL,
  `group_id` int NOT NULL,
  `permission_id` int NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `auth_permission`
--

CREATE TABLE `auth_permission` (
  `id` int NOT NULL,
  `name` varchar(255) NOT NULL,
  `content_type_id` int NOT NULL,
  `codename` varchar(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `auth_permission`
--

INSERT INTO `auth_permission` (`id`, `name`, `content_type_id`, `codename`) VALUES
(1, 'Can add log entry', 1, 'add_logentry'),
(2, 'Can change log entry', 1, 'change_logentry'),
(3, 'Can delete log entry', 1, 'delete_logentry'),
(4, 'Can view log entry', 1, 'view_logentry'),
(5, 'Can add permission', 2, 'add_permission'),
(6, 'Can change permission', 2, 'change_permission'),
(7, 'Can delete permission', 2, 'delete_permission'),
(8, 'Can view permission', 2, 'view_permission'),
(9, 'Can add group', 3, 'add_group'),
(10, 'Can change group', 3, 'change_group'),
(11, 'Can delete group', 3, 'delete_group'),
(12, 'Can view group', 3, 'view_group'),
(13, 'Can add user', 4, 'add_user'),
(14, 'Can change user', 4, 'change_user'),
(15, 'Can delete user', 4, 'delete_user'),
(16, 'Can view user', 4, 'view_user'),
(17, 'Can add content type', 5, 'add_contenttype'),
(18, 'Can change content type', 5, 'change_contenttype'),
(19, 'Can delete content type', 5, 'delete_contenttype'),
(20, 'Can view content type', 5, 'view_contenttype'),
(21, 'Can add session', 6, 'add_session'),
(22, 'Can change session', 6, 'change_session'),
(23, 'Can delete session', 6, 'delete_session'),
(24, 'Can view session', 6, 'view_session'),
(25, 'Can add division', 7, 'add_division'),
(26, 'Can change division', 7, 'change_division'),
(27, 'Can delete division', 7, 'delete_division'),
(28, 'Can view division', 7, 'view_division'),
(29, 'Can add position', 8, 'add_position'),
(30, 'Can change position', 8, 'change_position'),
(31, 'Can delete position', 8, 'delete_position'),
(32, 'Can view position', 8, 'view_position'),
(33, 'Can add employee', 9, 'add_employee'),
(34, 'Can change employee', 9, 'change_employee'),
(35, 'Can delete employee', 9, 'delete_employee'),
(36, 'Can view employee', 9, 'view_employee'),
(37, 'Can add holiday', 10, 'add_holiday'),
(38, 'Can change holiday', 10, 'change_holiday'),
(39, 'Can delete holiday', 10, 'delete_holiday'),
(40, 'Can view holiday', 10, 'view_holiday'),
(41, 'Can add Work Settings', 11, 'add_worksettings'),
(42, 'Can change Work Settings', 11, 'change_worksettings'),
(43, 'Can delete Work Settings', 11, 'delete_worksettings'),
(44, 'Can view Work Settings', 11, 'view_worksettings'),
(45, 'Can add attendance', 12, 'add_attendance'),
(46, 'Can change attendance', 12, 'change_attendance'),
(47, 'Can delete attendance', 12, 'delete_attendance'),
(48, 'Can view attendance', 12, 'view_attendance'),
(49, 'Can add attendance correction', 13, 'add_attendancecorrection'),
(50, 'Can change attendance correction', 13, 'change_attendancecorrection'),
(51, 'Can delete attendance correction', 13, 'delete_attendancecorrection'),
(52, 'Can view attendance correction', 13, 'view_attendancecorrection'),
(53, 'Can add Overtime Request', 14, 'add_overtimerequest'),
(54, 'Can change Overtime Request', 14, 'change_overtimerequest'),
(55, 'Can delete Overtime Request', 14, 'delete_overtimerequest'),
(56, 'Can view Overtime Request', 14, 'view_overtimerequest'),
(57, 'Can add Pengajuan Rekap Bulanan', 15, 'add_monthlysummaryrequest'),
(58, 'Can change Pengajuan Rekap Bulanan', 15, 'change_monthlysummaryrequest'),
(59, 'Can delete Pengajuan Rekap Bulanan', 15, 'delete_monthlysummaryrequest'),
(60, 'Can view Pengajuan Rekap Bulanan', 15, 'view_monthlysummaryrequest'),
(61, 'Can add Permission Template', 16, 'add_grouppermissiontemplate'),
(62, 'Can change Permission Template', 16, 'change_grouppermissiontemplate'),
(63, 'Can delete Permission Template', 16, 'delete_grouppermissiontemplate'),
(64, 'Can view Permission Template', 16, 'view_grouppermissiontemplate'),
(65, 'Can add Group Permission', 17, 'add_grouppermission'),
(66, 'Can change Group Permission', 17, 'change_grouppermission'),
(67, 'Can delete Group Permission', 17, 'delete_grouppermission'),
(68, 'Can view Group Permission', 17, 'view_grouppermission'),
(69, 'Can add Overtime Document', 18, 'add_overtimedocument'),
(70, 'Can change Overtime Document', 18, 'change_overtimedocument'),
(71, 'Can delete Overtime Document', 18, 'delete_overtimedocument'),
(72, 'Can view Overtime Document', 18, 'view_overtimedocument');

-- --------------------------------------------------------

--
-- Table structure for table `auth_user`
--

CREATE TABLE `auth_user` (
  `id` int NOT NULL,
  `password` varchar(128) NOT NULL,
  `last_login` datetime(6) DEFAULT NULL,
  `is_superuser` tinyint(1) NOT NULL,
  `username` varchar(150) NOT NULL,
  `first_name` varchar(150) NOT NULL,
  `last_name` varchar(150) NOT NULL,
  `email` varchar(254) NOT NULL,
  `is_staff` tinyint(1) NOT NULL,
  `is_active` tinyint(1) NOT NULL,
  `date_joined` datetime(6) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `auth_user`
--

INSERT INTO `auth_user` (`id`, `password`, `last_login`, `is_superuser`, `username`, `first_name`, `last_name`, `email`, `is_staff`, `is_active`, `date_joined`) VALUES
(1, 'pbkdf2_sha256$720000$UyVClCX82JygAhxLoAfczh$C8H2CgQFPhn8cxnR2UmrsMK3xIaMG0gjEqQMsRCiudg=', '2025-09-05 03:04:26.715851', 1, 'admin', '', '', 'admin@example.com', 1, 1, '2025-09-04 14:34:54.694675'),
(2, 'pbkdf2_sha256$720000$nU5jKTDxyTQXFFrDZtdsaU$sc5vcQ0tzVNMqDS7li7H2azWZC2mmMD7R3iE+ORdkkw=', NULL, 0, 'staf.konsuler1', '', '', '', 0, 1, '2025-09-05 02:44:20.577631'),
(3, 'pbkdf2_sha256$720000$gLIrB4i6p4AQuWwIKmTXOI$4As1+ISXa5Oy4v3wyLH96vz/6UAVql+VegoWsh1U/wg=', NULL, 0, 'staff.konsuler1', '', '', '', 0, 1, '2025-09-05 02:52:38.536477'),
(4, 'pbkdf2_sha256$720000$EwpuqE1d6jJNzjgktv2Xxr$NOqoRf7dl5oMgWPWjHuLTCFeySzOGLS+5tUQWdwkRtw=', NULL, 0, 'testuser', '', '', 'test@example.com', 0, 1, '2025-09-05 02:59:06.147744'),
(5, 'pbkdf2_sha256$720000$m1nkKNPOCKeED0Ohn0z0nv$L3YBavLmJ3PV/ZqScSfLjoaipyN8hAUX/WjMoYwyqm4=', NULL, 0, 'testuser2', '', '', 'test@example.com', 0, 1, '2025-09-05 03:01:06.202559'),
(6, 'pbkdf2_sha256$720000$Naek3JhRs82e4aLplHxgvw$/rdSzrSK4r3Bo2xrfAyy/GCpPe8dzqBTQpYxiLpx72g=', '2025-09-05 03:32:54.839613', 0, 'konsuler1', '', '', '', 0, 1, '2025-09-05 03:02:10.216220'),
(7, 'pbkdf2_sha256$720000$Kzu8BaPKfIpgFxTn16EquY$UWn7exiRKCSJhVgoFxe03O/+lXoNBZ8kO3WPkg8QLUg=', NULL, 0, 'ppk1', '', '', '', 0, 1, '2025-09-05 03:03:59.656418');

-- --------------------------------------------------------

--
-- Table structure for table `auth_user_groups`
--

CREATE TABLE `auth_user_groups` (
  `id` bigint NOT NULL,
  `user_id` int NOT NULL,
  `group_id` int NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `auth_user_groups`
--

INSERT INTO `auth_user_groups` (`id`, `user_id`, `group_id`) VALUES
(1, 2, 3),
(3, 3, 3),
(4, 5, 3),
(6, 6, 2),
(7, 7, 2);

-- --------------------------------------------------------

--
-- Table structure for table `auth_user_user_permissions`
--

CREATE TABLE `auth_user_user_permissions` (
  `id` bigint NOT NULL,
  `user_id` int NOT NULL,
  `permission_id` int NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `django_admin_log`
--

CREATE TABLE `django_admin_log` (
  `id` int NOT NULL,
  `action_time` datetime(6) NOT NULL,
  `object_id` longtext,
  `object_repr` varchar(200) NOT NULL,
  `action_flag` smallint UNSIGNED NOT NULL,
  `change_message` longtext NOT NULL,
  `content_type_id` int DEFAULT NULL,
  `user_id` int NOT NULL
) ;

-- --------------------------------------------------------

--
-- Table structure for table `django_content_type`
--

CREATE TABLE `django_content_type` (
  `id` int NOT NULL,
  `app_label` varchar(100) NOT NULL,
  `model` varchar(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `django_content_type`
--

INSERT INTO `django_content_type` (`id`, `app_label`, `model`) VALUES
(1, 'admin', 'logentry'),
(12, 'api', 'attendance'),
(13, 'api', 'attendancecorrection'),
(7, 'api', 'division'),
(9, 'api', 'employee'),
(17, 'api', 'grouppermission'),
(16, 'api', 'grouppermissiontemplate'),
(10, 'api', 'holiday'),
(15, 'api', 'monthlysummaryrequest'),
(18, 'api', 'overtimedocument'),
(14, 'api', 'overtimerequest'),
(8, 'api', 'position'),
(11, 'api', 'worksettings'),
(3, 'auth', 'group'),
(2, 'auth', 'permission'),
(4, 'auth', 'user'),
(5, 'contenttypes', 'contenttype'),
(6, 'sessions', 'session');

-- --------------------------------------------------------

--
-- Table structure for table `django_migrations`
--

CREATE TABLE `django_migrations` (
  `id` bigint NOT NULL,
  `app` varchar(255) NOT NULL,
  `name` varchar(255) NOT NULL,
  `applied` datetime(6) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `django_migrations`
--

INSERT INTO `django_migrations` (`id`, `app`, `name`, `applied`) VALUES
(1, 'contenttypes', '0001_initial', '2025-09-04 14:33:15.856142'),
(2, 'auth', '0001_initial', '2025-09-04 14:33:16.050464'),
(3, 'admin', '0001_initial', '2025-09-04 14:33:16.098484'),
(4, 'admin', '0002_logentry_remove_auto_add', '2025-09-04 14:33:16.101589'),
(5, 'admin', '0003_logentry_add_action_flag_choices', '2025-09-04 14:33:16.104038'),
(6, 'contenttypes', '0002_remove_content_type_name', '2025-09-04 14:33:16.136704'),
(7, 'auth', '0002_alter_permission_name_max_length', '2025-09-04 14:33:16.155964'),
(8, 'auth', '0003_alter_user_email_max_length', '2025-09-04 14:33:16.166517'),
(9, 'auth', '0004_alter_user_username_opts', '2025-09-04 14:33:16.169595'),
(10, 'auth', '0005_alter_user_last_login_null', '2025-09-04 14:33:16.185877'),
(11, 'auth', '0006_require_contenttypes_0002', '2025-09-04 14:33:16.186895'),
(12, 'auth', '0007_alter_validators_add_error_messages', '2025-09-04 14:33:16.189999'),
(13, 'auth', '0008_alter_user_username_max_length', '2025-09-04 14:33:16.223473'),
(14, 'auth', '0009_alter_user_last_name_max_length', '2025-09-04 14:33:16.247301'),
(15, 'auth', '0010_alter_group_name_max_length', '2025-09-04 14:33:16.254054'),
(16, 'auth', '0011_update_proxy_permissions', '2025-09-04 14:33:16.257243'),
(17, 'auth', '0012_alter_user_first_name_max_length', '2025-09-04 14:33:16.277738'),
(18, 'api', '0001_initial', '2025-09-04 14:33:16.363162'),
(19, 'api', '0002_employee_gaji_pokok_employee_tanggal_lahir_and_more', '2025-09-04 14:33:16.431516'),
(20, 'api', '0003_holiday_worksettings', '2025-09-04 14:33:16.447280'),
(21, 'api', '0004_alter_worksettings_workdays', '2025-09-04 14:33:16.448918'),
(22, 'api', '0005_worksettings_office_latitude_and_more', '2025-09-04 14:33:16.542356'),
(23, 'api', '0006_worksettings_friday_end_time_and_more', '2025-09-04 14:33:16.608290'),
(24, 'api', '0007_attendance_employee_note', '2025-09-04 14:33:16.624759'),
(25, 'api', '0008_attendance_correction', '2025-09-04 14:33:16.667277'),
(26, 'api', '0009_attendancecorrection_attachment', '2025-09-04 14:33:16.683486'),
(27, 'api', '0010_worksettings_overtime_rates', '2025-09-04 14:33:16.712355'),
(28, 'api', '0011_attendance_overtime_fields', '2025-09-04 14:33:16.835369'),
(44, 'sessions', '0001_initial', '2025-09-04 14:33:17.593948'),
(45, 'api', '0012_add_fullname_to_employee', '2025-09-05 02:57:14.048915'),
(46, 'api', '0013_add_overtime_threshold_minutes', '2025-09-05 02:57:45.986253'),
(47, 'api', '0014_add_overtime_request_model', '2025-09-05 02:58:25.117903'),
(48, 'api', '0015_attendance_ip_fields', '2025-09-05 02:58:25.119889'),
(49, 'api', '0016_add_2level_approval_system', '2025-09-05 02:58:25.120864'),
(50, 'api', '0017_overtimeexporthistory', '2025-09-05 02:58:25.122505'),
(51, 'api', '0018_add_monthly_summary_request_model', '2025-09-05 02:58:25.124033'),
(52, 'api', '0019_add_earliest_check_in_restriction', '2025-09-05 02:58:25.126023'),
(53, 'api', '0020_grouppermissiontemplate_grouppermission', '2025-09-05 02:58:25.127076'),
(54, 'api', '0021_alter_grouppermission_permission_type', '2025-09-05 02:58:25.128179'),
(55, 'api', '0022_add_level_0_approval', '2025-09-05 02:58:25.128953'),
(56, 'api', '0023_add_earliest_check_out_restriction', '2025-09-05 02:58:25.131197'),
(57, 'api', '0024_change_earliest_to_latest_check_out', '2025-09-05 02:58:25.131918'),
(58, 'api', '0025_add_rejection_fields_to_overtime_request', '2025-09-05 02:58:25.132756'),
(59, 'api', '0026_overtimedocument', '2025-09-05 02:58:25.133870');

-- --------------------------------------------------------

--
-- Table structure for table `django_session`
--

CREATE TABLE `django_session` (
  `session_key` varchar(40) NOT NULL,
  `session_data` longtext NOT NULL,
  `expire_date` datetime(6) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `django_session`
--

INSERT INTO `django_session` (`session_key`, `session_data`, `expire_date`) VALUES
('8500hbuah69gr0u0wli2o8sc35bk4cmf', '.eJxVjMsOwiAQRf-FtSGlTHm4dO83kBkGpGogKe3K-O_apAvd3nPOfYmA21rC1tMSZhZnYcTpdyOMj1R3wHestyZjq-syk9wVedAur43T83K4fwcFe_nWOUbypBxqNxmw2XlDamBAHMBHQ6PH0QIDa4KolXWgJ6NzNp6zh5TF-wPqPjfu:1uuNC2:MbeY62jryJpAm8uyi7eUc8W5q_rQmctwcAMDvmi5K_U', '2025-09-19 03:32:54.840737'),
('kaj59s2glfzwn6z3qngje4pgje4qhklb', '.eJxVjMsOwiAQRf-FtSGlTHm4dO83kBkGpGogKe3K-O_apAvd3nPOfYmA21rC1tMSZhZnYcTpdyOMj1R3wHestyZjq-syk9wVedAur43T83K4fwcFe_nWOUbypBxqNxmw2XlDamBAHMBHQ6PH0QIDa4KolXWgJ6NzNp6zh5TF-wPqPjfu:1uuNBv:oUYlrdBQ6ThOQruXj_-IkathJJt235NYgQ-L9POivbs', '2025-09-19 03:32:47.023811'),
('zcyea0ykhmnv5e82z33ddjoay8bxqaaw', '.eJxVjEsOAiEQRO_C2hA-AcSle89AGrpbRg0kw8zKeHdDMgtdVVLvVb1Fgn2raR-0pgXFRWhx-u0ylCe1CfAB7d5l6W1blyynIg865K0jva6H-3dQYdS55pA5kkWvS2EKCNFwnlGU8aysC9ZbawByiKyiZXdG5wlM1uhIi88XF-w4yg:1uuMkU:ctdxQU0wyi7eyh73DhHDM7cc1tJcHAawY3Qmi_JtE7U', '2025-09-19 03:04:26.717342');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `api_attendance`
--
ALTER TABLE `api_attendance`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `api_attendance_user_id_date_local_5de79bb6_uniq` (`user_id`,`date_local`),
  ADD KEY `api_attendance_employee_id_50158f8f_fk_api_employee_id` (`employee_id`),
  ADD KEY `api_attendance_overtime_approved_by_id_f4e030b6_fk_auth_user_id` (`overtime_approved_by_id`);

--
-- Indexes for table `api_attendancecorrection`
--
ALTER TABLE `api_attendancecorrection`
  ADD PRIMARY KEY (`id`),
  ADD KEY `api_attendancecorrection_reviewed_by_id_3614fde2_fk_auth_user_id` (`reviewed_by_id`),
  ADD KEY `api_attendancecorrection_user_id_a7330948_fk_auth_user_id` (`user_id`);

--
-- Indexes for table `api_division`
--
ALTER TABLE `api_division`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `name` (`name`);

--
-- Indexes for table `api_employee`
--
ALTER TABLE `api_employee`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `nip` (`nip`),
  ADD UNIQUE KEY `user_id` (`user_id`),
  ADD KEY `api_employee_division_id_f9ef1535_fk_api_division_id` (`division_id`),
  ADD KEY `api_employee_position_id_52ce9e36_fk_api_position_id` (`position_id`);

--
-- Indexes for table `api_grouppermission`
--
ALTER TABLE `api_grouppermission`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `api_grouppermission_group_id_permission_type_767ca70f_uniq` (`group_id`,`permission_type`,`permission_action`);

--
-- Indexes for table `api_grouppermissiontemplate`
--
ALTER TABLE `api_grouppermissiontemplate`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `name` (`name`);

--
-- Indexes for table `api_holiday`
--
ALTER TABLE `api_holiday`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `date` (`date`);

--
-- Indexes for table `api_monthlysummaryrequest`
--
ALTER TABLE `api_monthlysummaryrequest`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `api_monthlysummaryreques_employee_id_request_peri_a01e9e3f_uniq` (`employee_id`,`request_period`,`report_type`),
  ADD KEY `api_monthlysummaryre_final_approved_by_id_a4ed903a_fk_auth_user` (`final_approved_by_id`),
  ADD KEY `api_monthlysummaryre_level1_approved_by_i_28f99a36_fk_auth_user` (`level1_approved_by_id`),
  ADD KEY `api_monthlysummaryrequest_user_id_a2a95c66_fk_auth_user_id` (`user_id`);

--
-- Indexes for table `api_overtimedocument`
--
ALTER TABLE `api_overtimedocument`
  ADD PRIMARY KEY (`id`),
  ADD KEY `api_overtimedocument_overtime_request_id_2119876c_fk_api_overt` (`overtime_request_id`);

--
-- Indexes for table `api_overtimerequest`
--
ALTER TABLE `api_overtimerequest`
  ADD PRIMARY KEY (`id`),
  ADD KEY `api_overtimerequest_approved_by_id_4f92024d_fk_auth_user_id` (`approved_by_id`),
  ADD KEY `api_overtimerequest_employee_id_993dfcf4_fk_api_employee_id` (`employee_id`),
  ADD KEY `api_overtimerequest_user_id_8c74a9a6_fk_auth_user_id` (`user_id`),
  ADD KEY `api_overtimerequest_final_approved_by_id_2efa5199_fk_auth_user` (`final_approved_by_id`),
  ADD KEY `api_overtimerequest_level1_approved_by_i_399128b9_fk_auth_user` (`level1_approved_by_id`),
  ADD KEY `api_overtimerequest_final_rejected_by_id_0cd1c19d_fk_auth_user` (`final_rejected_by_id`),
  ADD KEY `api_overtimerequest_level1_rejected_by_i_8302606d_fk_auth_user` (`level1_rejected_by_id`);

--
-- Indexes for table `api_position`
--
ALTER TABLE `api_position`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `name` (`name`);

--
-- Indexes for table `api_worksettings`
--
ALTER TABLE `api_worksettings`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `auth_group`
--
ALTER TABLE `auth_group`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `name` (`name`);

--
-- Indexes for table `auth_group_permissions`
--
ALTER TABLE `auth_group_permissions`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `auth_group_permissions_group_id_permission_id_0cd325b0_uniq` (`group_id`,`permission_id`),
  ADD KEY `auth_group_permissio_permission_id_84c5c92e_fk_auth_perm` (`permission_id`);

--
-- Indexes for table `auth_permission`
--
ALTER TABLE `auth_permission`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `auth_permission_content_type_id_codename_01ab375a_uniq` (`content_type_id`,`codename`);

--
-- Indexes for table `auth_user`
--
ALTER TABLE `auth_user`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `username` (`username`);

--
-- Indexes for table `auth_user_groups`
--
ALTER TABLE `auth_user_groups`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `auth_user_groups_user_id_group_id_94350c0c_uniq` (`user_id`,`group_id`),
  ADD KEY `auth_user_groups_group_id_97559544_fk_auth_group_id` (`group_id`);

--
-- Indexes for table `auth_user_user_permissions`
--
ALTER TABLE `auth_user_user_permissions`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `auth_user_user_permissions_user_id_permission_id_14a6b632_uniq` (`user_id`,`permission_id`),
  ADD KEY `auth_user_user_permi_permission_id_1fbb5f2c_fk_auth_perm` (`permission_id`);

--
-- Indexes for table `django_admin_log`
--
ALTER TABLE `django_admin_log`
  ADD PRIMARY KEY (`id`),
  ADD KEY `django_admin_log_content_type_id_c4bce8eb_fk_django_co` (`content_type_id`),
  ADD KEY `django_admin_log_user_id_c564eba6_fk_auth_user_id` (`user_id`);

--
-- Indexes for table `django_content_type`
--
ALTER TABLE `django_content_type`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `django_content_type_app_label_model_76bd3d3b_uniq` (`app_label`,`model`);

--
-- Indexes for table `django_migrations`
--
ALTER TABLE `django_migrations`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `django_session`
--
ALTER TABLE `django_session`
  ADD PRIMARY KEY (`session_key`),
  ADD KEY `django_session_expire_date_a5c62663` (`expire_date`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `api_attendance`
--
ALTER TABLE `api_attendance`
  MODIFY `id` bigint NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `api_attendancecorrection`
--
ALTER TABLE `api_attendancecorrection`
  MODIFY `id` bigint NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `api_division`
--
ALTER TABLE `api_division`
  MODIFY `id` bigint NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `api_employee`
--
ALTER TABLE `api_employee`
  MODIFY `id` bigint NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `api_grouppermission`
--
ALTER TABLE `api_grouppermission`
  MODIFY `id` bigint NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `api_grouppermissiontemplate`
--
ALTER TABLE `api_grouppermissiontemplate`
  MODIFY `id` bigint NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `api_holiday`
--
ALTER TABLE `api_holiday`
  MODIFY `id` bigint NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `api_monthlysummaryrequest`
--
ALTER TABLE `api_monthlysummaryrequest`
  MODIFY `id` bigint NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `api_overtimedocument`
--
ALTER TABLE `api_overtimedocument`
  MODIFY `id` bigint NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `api_overtimerequest`
--
ALTER TABLE `api_overtimerequest`
  MODIFY `id` bigint NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `api_position`
--
ALTER TABLE `api_position`
  MODIFY `id` bigint NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `api_worksettings`
--
ALTER TABLE `api_worksettings`
  MODIFY `id` bigint NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `auth_group`
--
ALTER TABLE `auth_group`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `auth_group_permissions`
--
ALTER TABLE `auth_group_permissions`
  MODIFY `id` bigint NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `auth_permission`
--
ALTER TABLE `auth_permission`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=73;

--
-- AUTO_INCREMENT for table `auth_user`
--
ALTER TABLE `auth_user`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT for table `auth_user_groups`
--
ALTER TABLE `auth_user_groups`
  MODIFY `id` bigint NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `auth_user_user_permissions`
--
ALTER TABLE `auth_user_user_permissions`
  MODIFY `id` bigint NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `django_admin_log`
--
ALTER TABLE `django_admin_log`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `django_content_type`
--
ALTER TABLE `django_content_type`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=19;

--
-- AUTO_INCREMENT for table `django_migrations`
--
ALTER TABLE `django_migrations`
  MODIFY `id` bigint NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=60;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `api_attendance`
--
ALTER TABLE `api_attendance`
  ADD CONSTRAINT `api_attendance_employee_id_50158f8f_fk_api_employee_id` FOREIGN KEY (`employee_id`) REFERENCES `api_employee` (`id`),
  ADD CONSTRAINT `api_attendance_overtime_approved_by_id_f4e030b6_fk_auth_user_id` FOREIGN KEY (`overtime_approved_by_id`) REFERENCES `auth_user` (`id`),
  ADD CONSTRAINT `api_attendance_user_id_ad28dc45_fk_auth_user_id` FOREIGN KEY (`user_id`) REFERENCES `auth_user` (`id`);

--
-- Constraints for table `api_attendancecorrection`
--
ALTER TABLE `api_attendancecorrection`
  ADD CONSTRAINT `api_attendancecorrection_reviewed_by_id_3614fde2_fk_auth_user_id` FOREIGN KEY (`reviewed_by_id`) REFERENCES `auth_user` (`id`),
  ADD CONSTRAINT `api_attendancecorrection_user_id_a7330948_fk_auth_user_id` FOREIGN KEY (`user_id`) REFERENCES `auth_user` (`id`);

--
-- Constraints for table `api_employee`
--
ALTER TABLE `api_employee`
  ADD CONSTRAINT `api_employee_division_id_f9ef1535_fk_api_division_id` FOREIGN KEY (`division_id`) REFERENCES `api_division` (`id`),
  ADD CONSTRAINT `api_employee_position_id_52ce9e36_fk_api_position_id` FOREIGN KEY (`position_id`) REFERENCES `api_position` (`id`),
  ADD CONSTRAINT `api_employee_user_id_ed8ba4e1_fk_auth_user_id` FOREIGN KEY (`user_id`) REFERENCES `auth_user` (`id`);

--
-- Constraints for table `api_grouppermission`
--
ALTER TABLE `api_grouppermission`
  ADD CONSTRAINT `api_grouppermission_group_id_f0de182e_fk_auth_group_id` FOREIGN KEY (`group_id`) REFERENCES `auth_group` (`id`);

--
-- Constraints for table `api_monthlysummaryrequest`
--
ALTER TABLE `api_monthlysummaryrequest`
  ADD CONSTRAINT `api_monthlysummaryre_employee_id_b7d1423c_fk_api_emplo` FOREIGN KEY (`employee_id`) REFERENCES `api_employee` (`id`),
  ADD CONSTRAINT `api_monthlysummaryre_final_approved_by_id_a4ed903a_fk_auth_user` FOREIGN KEY (`final_approved_by_id`) REFERENCES `auth_user` (`id`),
  ADD CONSTRAINT `api_monthlysummaryre_level1_approved_by_i_28f99a36_fk_auth_user` FOREIGN KEY (`level1_approved_by_id`) REFERENCES `auth_user` (`id`),
  ADD CONSTRAINT `api_monthlysummaryrequest_user_id_a2a95c66_fk_auth_user_id` FOREIGN KEY (`user_id`) REFERENCES `auth_user` (`id`);

--
-- Constraints for table `api_overtimedocument`
--
ALTER TABLE `api_overtimedocument`
  ADD CONSTRAINT `api_overtimedocument_overtime_request_id_2119876c_fk_api_overt` FOREIGN KEY (`overtime_request_id`) REFERENCES `api_overtimerequest` (`id`);

--
-- Constraints for table `api_overtimerequest`
--
ALTER TABLE `api_overtimerequest`
  ADD CONSTRAINT `api_overtimerequest_approved_by_id_4f92024d_fk_auth_user_id` FOREIGN KEY (`approved_by_id`) REFERENCES `auth_user` (`id`),
  ADD CONSTRAINT `api_overtimerequest_employee_id_993dfcf4_fk_api_employee_id` FOREIGN KEY (`employee_id`) REFERENCES `api_employee` (`id`),
  ADD CONSTRAINT `api_overtimerequest_final_approved_by_id_2efa5199_fk_auth_user` FOREIGN KEY (`final_approved_by_id`) REFERENCES `auth_user` (`id`),
  ADD CONSTRAINT `api_overtimerequest_final_rejected_by_id_0cd1c19d_fk_auth_user` FOREIGN KEY (`final_rejected_by_id`) REFERENCES `auth_user` (`id`),
  ADD CONSTRAINT `api_overtimerequest_level1_approved_by_i_399128b9_fk_auth_user` FOREIGN KEY (`level1_approved_by_id`) REFERENCES `auth_user` (`id`),
  ADD CONSTRAINT `api_overtimerequest_level1_rejected_by_i_8302606d_fk_auth_user` FOREIGN KEY (`level1_rejected_by_id`) REFERENCES `auth_user` (`id`),
  ADD CONSTRAINT `api_overtimerequest_user_id_8c74a9a6_fk_auth_user_id` FOREIGN KEY (`user_id`) REFERENCES `auth_user` (`id`);

--
-- Constraints for table `auth_group_permissions`
--
ALTER TABLE `auth_group_permissions`
  ADD CONSTRAINT `auth_group_permissio_permission_id_84c5c92e_fk_auth_perm` FOREIGN KEY (`permission_id`) REFERENCES `auth_permission` (`id`),
  ADD CONSTRAINT `auth_group_permissions_group_id_b120cbf9_fk_auth_group_id` FOREIGN KEY (`group_id`) REFERENCES `auth_group` (`id`);

--
-- Constraints for table `auth_permission`
--
ALTER TABLE `auth_permission`
  ADD CONSTRAINT `auth_permission_content_type_id_2f476e4b_fk_django_co` FOREIGN KEY (`content_type_id`) REFERENCES `django_content_type` (`id`);

--
-- Constraints for table `auth_user_groups`
--
ALTER TABLE `auth_user_groups`
  ADD CONSTRAINT `auth_user_groups_group_id_97559544_fk_auth_group_id` FOREIGN KEY (`group_id`) REFERENCES `auth_group` (`id`),
  ADD CONSTRAINT `auth_user_groups_user_id_6a12ed8b_fk_auth_user_id` FOREIGN KEY (`user_id`) REFERENCES `auth_user` (`id`);

--
-- Constraints for table `auth_user_user_permissions`
--
ALTER TABLE `auth_user_user_permissions`
  ADD CONSTRAINT `auth_user_user_permi_permission_id_1fbb5f2c_fk_auth_perm` FOREIGN KEY (`permission_id`) REFERENCES `auth_permission` (`id`),
  ADD CONSTRAINT `auth_user_user_permissions_user_id_a95ead1b_fk_auth_user_id` FOREIGN KEY (`user_id`) REFERENCES `auth_user` (`id`);

--
-- Constraints for table `django_admin_log`
--
ALTER TABLE `django_admin_log`
  ADD CONSTRAINT `django_admin_log_content_type_id_c4bce8eb_fk_django_co` FOREIGN KEY (`content_type_id`) REFERENCES `django_content_type` (`id`),
  ADD CONSTRAINT `django_admin_log_user_id_c564eba6_fk_auth_user_id` FOREIGN KEY (`user_id`) REFERENCES `auth_user` (`id`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
