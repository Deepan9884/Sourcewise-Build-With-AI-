-- SourceWise Demo Data Seed
-- Run this in Supabase SQL Editor
-- User ID: 098ac993-cd75-446e-9ccd-b0ff77d8278c
-- Email: demo@gmail.com / Password: 123456

DO $$ DECLARE uid uuid := '098ac993-cd75-446e-9ccd-b0ff77d8278c';
  sid0 uuid := '2ece8dcc-8afb-4bab-998c-7a43473f0a72';
  sid1 uuid := '0a8674a8-1779-464d-9f41-e31a058f4901';
  sid2 uuid := 'eaed8257-dc4d-4c72-a858-fde87d61395e';
  sid3 uuid := '3a13dd24-0136-4819-9dfc-a5a752c3bcc2';
  sid4 uuid := '8cad0492-0f9d-4633-b347-d82106966ff2';
  sid5 uuid := '2908ec52-6763-4b83-a10c-79c373ee2c8e';
  sid6 uuid := 'dcbfeec2-0b15-4835-994c-b437cbe1559e';
  sid7 uuid := '38de971d-7cf7-4ec4-8173-a04f305c886c';
BEGIN

-- Learning profile update
INSERT INTO learning_profiles (user_id, concept_mastery, knowledge_gaps, study_patterns, preferences)
VALUES (uid, '{}', '{}', '{"daily_goal_minutes": 120}', '{"style": "visual", "difficulty": "medium"}')
ON CONFLICT (user_id) DO UPDATE SET preferences = EXCLUDED.preferences;

-- User credits update
INSERT INTO user_credits (user_id, total_credits, used_credits, reserved_credits, credit_tier)
VALUES (uid, 10000, 3247, 0, 'pro')
ON CONFLICT (user_id) DO UPDATE SET total_credits=10000, used_credits=3247, credit_tier='pro';

-- Sources (uploaded study materials)
DELETE FROM sources WHERE user_id = uid;
INSERT INTO sources (id, user_id, name, type, status, chunks_count, summary, difficulty, estimated_reading_time, concepts, analysis, created_at)
VALUES ('2ece8dcc-8afb-4bab-998c-7a43473f0a72', uid, 'Introduction to Machine Learning - Stanford CS229.pdf', 'pdf', 'ready', 342, 'Comprehensive introduction to ML covering supervised learning, neural networks, SVMs, and unsupervised methods.', 'hard', 480, '["Linear Regression","Logistic Regression","Neural Networks","Support Vector Machines","K-Means Clustering","PCA","Reinforcement Learning"]', '{"overview":"Comprehensive introduction to ML covering supervised learning, neural networks, SVMs, and unsupervised methods.","key_concepts":["Linear Regression","Logistic Regression","Neural Networks","Support Vector Machines","K-Means Clustering","PCA","Reinforcement Learning"],"difficulty_assessment":"hard","estimated_study_time":480}', '2026-09-14T03:03:32.577Z');
INSERT INTO sources (id, user_id, name, type, status, chunks_count, summary, difficulty, estimated_reading_time, concepts, analysis, created_at)
VALUES ('0a8674a8-1779-464d-9f41-e31a058f4901', uid, 'Data Structures and Algorithms - CLRS 4th Edition.pdf', 'pdf', 'ready', 891, 'The definitive textbook on algorithms covering sorting, graph theory, dynamic programming, and advanced data structures.', 'hard', 960, '["Big-O Notation","Sorting Algorithms","Dynamic Programming","Graph Algorithms","Red-Black Trees","Hash Tables","Greedy Algorithms","NP-Completeness"]', '{"overview":"The definitive textbook on algorithms covering sorting, graph theory, dynamic programming, and advanced data structures.","key_concepts":["Big-O Notation","Sorting Algorithms","Dynamic Programming","Graph Algorithms","Red-Black Trees","Hash Tables","Greedy Algorithms","NP-Completeness"],"difficulty_assessment":"hard","estimated_study_time":960}', '2026-09-17T03:03:32.578Z');
INSERT INTO sources (id, user_id, name, type, status, chunks_count, summary, difficulty, estimated_reading_time, concepts, analysis, created_at)
VALUES ('eaed8257-dc4d-4c72-a858-fde87d61395e', uid, 'System Design Interview - Alex Xu Volume 2.pdf', 'pdf', 'ready', 278, 'Practical guide to designing large-scale distributed systems with case studies.', 'medium', 360, '["Load Balancing","Database Sharding","Caching Strategies","Message Queues","CDN","Microservices","CAP Theorem"]', '{"overview":"Practical guide to designing large-scale distributed systems with case studies.","key_concepts":["Load Balancing","Database Sharding","Caching Strategies","Message Queues","CDN","Microservices","CAP Theorem"],"difficulty_assessment":"medium","estimated_study_time":360}', '2026-09-20T03:03:32.578Z');
INSERT INTO sources (id, user_id, name, type, status, chunks_count, summary, difficulty, estimated_reading_time, concepts, analysis, created_at)
VALUES ('3a13dd24-0136-4819-9dfc-a5a752c3bcc2', uid, 'Linear Algebra Done Right - Axler.pdf', 'pdf', 'ready', 198, 'Mathematically rigorous approach to linear algebra focusing on vector spaces and linear maps.', 'medium', 300, '["Vector Spaces","Linear Maps","Eigenvalues","Inner Products","Spectral Theorem","Operators"]', '{"overview":"Mathematically rigorous approach to linear algebra focusing on vector spaces and linear maps.","key_concepts":["Vector Spaces","Linear Maps","Eigenvalues","Inner Products","Spectral Theorem","Operators"],"difficulty_assessment":"medium","estimated_study_time":300}', '2026-09-22T03:03:32.578Z');
INSERT INTO sources (id, user_id, name, type, status, chunks_count, summary, difficulty, estimated_reading_time, concepts, analysis, created_at)
VALUES ('8cad0492-0f9d-4633-b347-d82106966ff2', uid, 'Probability and Statistics for ML - Murphy.pdf', 'pdf', 'ready', 423, 'Statistical foundations for machine learning including Bayesian inference and graphical models.', 'hard', 540, '["Bayes Theorem","Gaussian Distributions","Maximum Likelihood","EM Algorithm","Graphical Models","MCMC"]', '{"overview":"Statistical foundations for machine learning including Bayesian inference and graphical models.","key_concepts":["Bayes Theorem","Gaussian Distributions","Maximum Likelihood","EM Algorithm","Graphical Models","MCMC"],"difficulty_assessment":"hard","estimated_study_time":540}', '2026-09-25T03:03:32.578Z');
INSERT INTO sources (id, user_id, name, type, status, chunks_count, summary, difficulty, estimated_reading_time, concepts, analysis, created_at)
VALUES ('2908ec52-6763-4b83-a10c-79c373ee2c8e', uid, 'Operating Systems - Three Easy Pieces.pdf', 'pdf', 'ready', 312, 'Modern approach to operating systems covering virtualization, concurrency, and persistence.', 'medium', 420, '["Process Scheduling","Virtual Memory","File Systems","Threads & Locks","Deadlock","I/O Systems"]', '{"overview":"Modern approach to operating systems covering virtualization, concurrency, and persistence.","key_concepts":["Process Scheduling","Virtual Memory","File Systems","Threads & Locks","Deadlock","I/O Systems"],"difficulty_assessment":"medium","estimated_study_time":420}', '2026-09-27T03:03:32.578Z');
INSERT INTO sources (id, user_id, name, type, status, chunks_count, summary, difficulty, estimated_reading_time, concepts, analysis, created_at)
VALUES ('dcbfeec2-0b15-4835-994c-b437cbe1559e', uid, 'Week 3 Lecture Notes - Neural Architecture Search.pdf', 'pdf', 'ready', 47, 'Lecture notes on Neural Architecture Search covering differentiable architecture search.', 'hard', 60, '["DARTS","Efficient NAS","Hardware-aware NAS","Once-for-All Networks","Proxy Tasks"]', '{"overview":"Lecture notes on Neural Architecture Search covering differentiable architecture search.","key_concepts":["DARTS","Efficient NAS","Hardware-aware NAS","Once-for-All Networks","Proxy Tasks"],"difficulty_assessment":"hard","estimated_study_time":60}', '2026-09-29T03:03:32.578Z');
INSERT INTO sources (id, user_id, name, type, status, chunks_count, summary, difficulty, estimated_reading_time, concepts, analysis, created_at)
VALUES ('38de971d-7cf7-4ec4-8173-a04f305c886c', uid, 'Database Systems - Ramakrishnan & Gehrke.pdf', 'pdf', 'ready', 612, 'Comprehensive coverage of relational database systems including SQL and query optimization.', 'medium', 600, '["SQL","Query Optimization","ACID Transactions","B+ Trees","Concurrency Control","Recovery"]', '{"overview":"Comprehensive coverage of relational database systems including SQL and query optimization.","key_concepts":["SQL","Query Optimization","ACID Transactions","B+ Trees","Concurrency Control","Recovery"],"difficulty_assessment":"medium","estimated_study_time":600}', '2026-09-30T03:03:32.578Z');

-- Source analysis
DELETE FROM source_analysis WHERE user_id = uid;
INSERT INTO source_analysis (source_id, user_id, summary, key_concepts, difficulty, estimated_reading_time)
VALUES ('2ece8dcc-8afb-4bab-998c-7a43473f0a72', uid, 'Comprehensive introduction to ML covering supervised learning, neural networks, SVMs, and unsupervised methods.', '["Linear Regression","Logistic Regression","Neural Networks","Support Vector Machines","K-Means Clustering","PCA","Reinforcement Learning"]', 'hard', 480);
INSERT INTO source_analysis (source_id, user_id, summary, key_concepts, difficulty, estimated_reading_time)
VALUES ('0a8674a8-1779-464d-9f41-e31a058f4901', uid, 'The definitive textbook on algorithms covering sorting, graph theory, dynamic programming, and advanced data structures.', '["Big-O Notation","Sorting Algorithms","Dynamic Programming","Graph Algorithms","Red-Black Trees","Hash Tables","Greedy Algorithms","NP-Completeness"]', 'hard', 960);
INSERT INTO source_analysis (source_id, user_id, summary, key_concepts, difficulty, estimated_reading_time)
VALUES ('eaed8257-dc4d-4c72-a858-fde87d61395e', uid, 'Practical guide to designing large-scale distributed systems with case studies.', '["Load Balancing","Database Sharding","Caching Strategies","Message Queues","CDN","Microservices","CAP Theorem"]', 'medium', 360);
INSERT INTO source_analysis (source_id, user_id, summary, key_concepts, difficulty, estimated_reading_time)
VALUES ('3a13dd24-0136-4819-9dfc-a5a752c3bcc2', uid, 'Mathematically rigorous approach to linear algebra focusing on vector spaces and linear maps.', '["Vector Spaces","Linear Maps","Eigenvalues","Inner Products","Spectral Theorem","Operators"]', 'medium', 300);
INSERT INTO source_analysis (source_id, user_id, summary, key_concepts, difficulty, estimated_reading_time)
VALUES ('8cad0492-0f9d-4633-b347-d82106966ff2', uid, 'Statistical foundations for machine learning including Bayesian inference and graphical models.', '["Bayes Theorem","Gaussian Distributions","Maximum Likelihood","EM Algorithm","Graphical Models","MCMC"]', 'hard', 540);
INSERT INTO source_analysis (source_id, user_id, summary, key_concepts, difficulty, estimated_reading_time)
VALUES ('2908ec52-6763-4b83-a10c-79c373ee2c8e', uid, 'Modern approach to operating systems covering virtualization, concurrency, and persistence.', '["Process Scheduling","Virtual Memory","File Systems","Threads & Locks","Deadlock","I/O Systems"]', 'medium', 420);
INSERT INTO source_analysis (source_id, user_id, summary, key_concepts, difficulty, estimated_reading_time)
VALUES ('dcbfeec2-0b15-4835-994c-b437cbe1559e', uid, 'Lecture notes on Neural Architecture Search covering differentiable architecture search.', '["DARTS","Efficient NAS","Hardware-aware NAS","Once-for-All Networks","Proxy Tasks"]', 'hard', 60);
INSERT INTO source_analysis (source_id, user_id, summary, key_concepts, difficulty, estimated_reading_time)
VALUES ('38de971d-7cf7-4ec4-8173-a04f305c886c', uid, 'Comprehensive coverage of relational database systems including SQL and query optimization.', '["SQL","Query Optimization","ACID Transactions","B+ Trees","Concurrency Control","Recovery"]', 'medium', 600);

-- Concept mastery
DELETE FROM concept_mastery WHERE user_id = uid;
INSERT INTO concept_mastery (user_id, concept, source_id, mastery_score, confidence_score, total_attempts, correct_attempts, last_assessed, next_review_date, interval_days, level)
VALUES (uid, 'Linear Regression', '2ece8dcc-8afb-4bab-998c-7a43473f0a72', 92, 95, 18, 16, '2026-09-30T03:03:32.579Z', '2026-10-09T03:03:32.579Z', 7, 'mastery');
INSERT INTO concept_mastery (user_id, concept, source_id, mastery_score, confidence_score, total_attempts, correct_attempts, last_assessed, next_review_date, interval_days, level)
VALUES (uid, 'Logistic Regression', '2ece8dcc-8afb-4bab-998c-7a43473f0a72', 88, 85, 12, 10, '2026-09-29T03:03:32.579Z', '2026-10-07T03:03:32.579Z', 5, 'proficient');
INSERT INTO concept_mastery (user_id, concept, source_id, mastery_score, confidence_score, total_attempts, correct_attempts, last_assessed, next_review_date, interval_days, level)
VALUES (uid, 'Neural Networks', '2ece8dcc-8afb-4bab-998c-7a43473f0a72', 74, 70, 15, 11, '2026-10-01T03:03:32.579Z', '2026-10-05T03:03:32.579Z', 3, 'developing');
INSERT INTO concept_mastery (user_id, concept, source_id, mastery_score, confidence_score, total_attempts, correct_attempts, last_assessed, next_review_date, interval_days, level)
VALUES (uid, 'Support Vector Machines', '2ece8dcc-8afb-4bab-998c-7a43473f0a72', 61, 55, 9, 5, '2026-09-28T03:03:32.579Z', '2026-10-03T03:03:32.579Z', 1, 'developing');
INSERT INTO concept_mastery (user_id, concept, source_id, mastery_score, confidence_score, total_attempts, correct_attempts, last_assessed, next_review_date, interval_days, level)
VALUES (uid, 'K-Means Clustering', '2ece8dcc-8afb-4bab-998c-7a43473f0a72', 85, 80, 10, 8, '2026-09-27T03:03:32.579Z', '2026-10-05T03:03:32.579Z', 3, 'proficient');
INSERT INTO concept_mastery (user_id, concept, source_id, mastery_score, confidence_score, total_attempts, correct_attempts, last_assessed, next_review_date, interval_days, level)
VALUES (uid, 'PCA', '2ece8dcc-8afb-4bab-998c-7a43473f0a72', 45, 40, 6, 2, '2026-09-26T03:03:32.579Z', '2026-10-02T03:03:32.579Z', 1, 'novice');
INSERT INTO concept_mastery (user_id, concept, source_id, mastery_score, confidence_score, total_attempts, correct_attempts, last_assessed, next_review_date, interval_days, level)
VALUES (uid, 'Reinforcement Learning', '2ece8dcc-8afb-4bab-998c-7a43473f0a72', 38, 30, 5, 1, '2026-09-24T03:03:32.579Z', '2026-10-02T03:03:32.579Z', 1, 'novice');
INSERT INTO concept_mastery (user_id, concept, source_id, mastery_score, confidence_score, total_attempts, correct_attempts, last_assessed, next_review_date, interval_days, level)
VALUES (uid, 'Big-O Notation', '0a8674a8-1779-464d-9f41-e31a058f4901', 96, 99, 22, 21, '2026-10-01T03:03:32.579Z', '2026-10-12T03:03:32.579Z', 10, 'mastery');
INSERT INTO concept_mastery (user_id, concept, source_id, mastery_score, confidence_score, total_attempts, correct_attempts, last_assessed, next_review_date, interval_days, level)
VALUES (uid, 'Dynamic Programming', '0a8674a8-1779-464d-9f41-e31a058f4901', 71, 65, 14, 10, '2026-09-30T03:03:32.579Z', '2026-10-04T03:03:32.579Z', 2, 'developing');
INSERT INTO concept_mastery (user_id, concept, source_id, mastery_score, confidence_score, total_attempts, correct_attempts, last_assessed, next_review_date, interval_days, level)
VALUES (uid, 'Graph Algorithms', '0a8674a8-1779-464d-9f41-e31a058f4901', 79, 75, 11, 8, '2026-09-29T03:03:32.579Z', '2026-10-05T03:03:32.579Z', 3, 'proficient');
INSERT INTO concept_mastery (user_id, concept, source_id, mastery_score, confidence_score, total_attempts, correct_attempts, last_assessed, next_review_date, interval_days, level)
VALUES (uid, 'Red-Black Trees', '0a8674a8-1779-464d-9f41-e31a058f4901', 52, 45, 7, 3, '2026-09-25T03:03:32.579Z', '2026-10-02T03:03:32.579Z', 1, 'developing');
INSERT INTO concept_mastery (user_id, concept, source_id, mastery_score, confidence_score, total_attempts, correct_attempts, last_assessed, next_review_date, interval_days, level)
VALUES (uid, 'Hash Tables', '0a8674a8-1779-464d-9f41-e31a058f4901', 91, 90, 16, 14, '2026-09-30T03:03:32.579Z', '2026-10-09T03:03:32.579Z', 7, 'mastery');
INSERT INTO concept_mastery (user_id, concept, source_id, mastery_score, confidence_score, total_attempts, correct_attempts, last_assessed, next_review_date, interval_days, level)
VALUES (uid, 'Load Balancing', 'eaed8257-dc4d-4c72-a858-fde87d61395e', 83, 80, 8, 6, '2026-09-28T03:03:32.579Z', '2026-10-05T03:03:32.579Z', 3, 'proficient');
INSERT INTO concept_mastery (user_id, concept, source_id, mastery_score, confidence_score, total_attempts, correct_attempts, last_assessed, next_review_date, interval_days, level)
VALUES (uid, 'Database Sharding', 'eaed8257-dc4d-4c72-a858-fde87d61395e', 67, 60, 6, 4, '2026-09-27T03:03:32.579Z', '2026-10-03T03:03:32.579Z', 1, 'developing');
INSERT INTO concept_mastery (user_id, concept, source_id, mastery_score, confidence_score, total_attempts, correct_attempts, last_assessed, next_review_date, interval_days, level)
VALUES (uid, 'CAP Theorem', 'eaed8257-dc4d-4c72-a858-fde87d61395e', 75, 70, 8, 6, '2026-09-26T03:03:32.579Z', '2026-10-05T03:03:32.579Z', 3, 'proficient');
INSERT INTO concept_mastery (user_id, concept, source_id, mastery_score, confidence_score, total_attempts, correct_attempts, last_assessed, next_review_date, interval_days, level)
VALUES (uid, 'Vector Spaces', '3a13dd24-0136-4819-9dfc-a5a752c3bcc2', 88, 85, 10, 9, '2026-09-29T03:03:32.579Z', '2026-10-07T03:03:32.579Z', 5, 'proficient');
INSERT INTO concept_mastery (user_id, concept, source_id, mastery_score, confidence_score, total_attempts, correct_attempts, last_assessed, next_review_date, interval_days, level)
VALUES (uid, 'Eigenvalues', '3a13dd24-0136-4819-9dfc-a5a752c3bcc2', 72, 65, 8, 5, '2026-09-27T03:03:32.579Z', '2026-10-03T03:03:32.579Z', 1, 'developing');
INSERT INTO concept_mastery (user_id, concept, source_id, mastery_score, confidence_score, total_attempts, correct_attempts, last_assessed, next_review_date, interval_days, level)
VALUES (uid, 'Spectral Theorem', '3a13dd24-0136-4819-9dfc-a5a752c3bcc2', 48, 40, 5, 2, '2026-09-24T03:03:32.579Z', '2026-10-02T03:03:32.579Z', 1, 'novice');

-- Knowledge gaps
DELETE FROM knowledge_gaps WHERE user_id = uid;
INSERT INTO knowledge_gaps (user_id, concept, source_id, severity, status)
VALUES (uid, 'PCA', '2ece8dcc-8afb-4bab-998c-7a43473f0a72', 5, 'open');
INSERT INTO knowledge_gaps (user_id, concept, source_id, severity, status)
VALUES (uid, 'Reinforcement Learning', '2ece8dcc-8afb-4bab-998c-7a43473f0a72', 4, 'open');
INSERT INTO knowledge_gaps (user_id, concept, source_id, severity, status)
VALUES (uid, 'Red-Black Trees', '0a8674a8-1779-464d-9f41-e31a058f4901', 4, 'open');
INSERT INTO knowledge_gaps (user_id, concept, source_id, severity, status)
VALUES (uid, 'Spectral Theorem', '3a13dd24-0136-4819-9dfc-a5a752c3bcc2', 3, 'open');
INSERT INTO knowledge_gaps (user_id, concept, source_id, severity, status)
VALUES (uid, 'EM Algorithm', '8cad0492-0f9d-4633-b347-d82106966ff2', 5, 'open');
INSERT INTO knowledge_gaps (user_id, concept, source_id, severity, status)
VALUES (uid, 'MCMC', '8cad0492-0f9d-4633-b347-d82106966ff2', 4, 'open');
INSERT INTO knowledge_gaps (user_id, concept, source_id, severity, status, resolved_at)
VALUES (uid, 'Linear Regression', '2ece8dcc-8afb-4bab-998c-7a43473f0a72', 2, 'resolved', '2026-09-27T03:03:32.579Z');
INSERT INTO knowledge_gaps (user_id, concept, source_id, severity, status, resolved_at)
VALUES (uid, 'Big-O Notation', '0a8674a8-1779-464d-9f41-e31a058f4901', 3, 'resolved', '2026-09-22T03:03:32.579Z');

-- Review schedule (spaced repetition)
DELETE FROM review_schedule WHERE user_id = uid;
INSERT INTO review_schedule (user_id, concept, source_id, mastery_score, next_review_date, interval_days, last_reviewed, review_count)
VALUES (uid, 'PCA', '2ece8dcc-8afb-4bab-998c-7a43473f0a72', 45, '2026-10-02T03:03:32.579Z', 1, '2026-10-01T03:03:32.579Z', 3);
INSERT INTO review_schedule (user_id, concept, source_id, mastery_score, next_review_date, interval_days, last_reviewed, review_count)
VALUES (uid, 'Reinforcement Learning', '2ece8dcc-8afb-4bab-998c-7a43473f0a72', 38, '2026-10-02T03:03:32.579Z', 1, '2026-09-30T03:03:32.579Z', 2);
INSERT INTO review_schedule (user_id, concept, source_id, mastery_score, next_review_date, interval_days, last_reviewed, review_count)
VALUES (uid, 'Red-Black Trees', '0a8674a8-1779-464d-9f41-e31a058f4901', 52, '2026-10-02T03:03:32.579Z', 1, '2026-10-01T03:03:32.579Z', 4);
INSERT INTO review_schedule (user_id, concept, source_id, mastery_score, next_review_date, interval_days, last_reviewed, review_count)
VALUES (uid, 'Support Vector Machines', '2ece8dcc-8afb-4bab-998c-7a43473f0a72', 61, '2026-10-03T03:03:32.579Z', 1, '2026-10-01T03:03:32.579Z', 6);
INSERT INTO review_schedule (user_id, concept, source_id, mastery_score, next_review_date, interval_days, last_reviewed, review_count)
VALUES (uid, 'Database Sharding', 'eaed8257-dc4d-4c72-a858-fde87d61395e', 67, '2026-10-03T03:03:32.579Z', 1, '2026-09-30T03:03:32.579Z', 3);
INSERT INTO review_schedule (user_id, concept, source_id, mastery_score, next_review_date, interval_days, last_reviewed, review_count)
VALUES (uid, 'Eigenvalues', '3a13dd24-0136-4819-9dfc-a5a752c3bcc2', 72, '2026-10-03T03:03:32.579Z', 1, '2026-09-30T03:03:32.579Z', 5);
INSERT INTO review_schedule (user_id, concept, source_id, mastery_score, next_review_date, interval_days, last_reviewed, review_count)
VALUES (uid, 'Dynamic Programming', '0a8674a8-1779-464d-9f41-e31a058f4901', 71, '2026-10-04T03:03:32.579Z', 2, '2026-09-30T03:03:32.579Z', 7);
INSERT INTO review_schedule (user_id, concept, source_id, mastery_score, next_review_date, interval_days, last_reviewed, review_count)
VALUES (uid, 'Neural Networks', '2ece8dcc-8afb-4bab-998c-7a43473f0a72', 74, '2026-10-05T03:03:32.579Z', 3, '2026-10-01T03:03:32.579Z', 8);
INSERT INTO review_schedule (user_id, concept, source_id, mastery_score, next_review_date, interval_days, last_reviewed, review_count)
VALUES (uid, 'Graph Algorithms', '0a8674a8-1779-464d-9f41-e31a058f4901', 79, '2026-10-05T03:03:32.579Z', 3, '2026-09-29T03:03:32.579Z', 6);
INSERT INTO review_schedule (user_id, concept, source_id, mastery_score, next_review_date, interval_days, last_reviewed, review_count)
VALUES (uid, 'Load Balancing', 'eaed8257-dc4d-4c72-a858-fde87d61395e', 83, '2026-10-05T03:03:32.579Z', 3, '2026-09-28T03:03:32.579Z', 5);
INSERT INTO review_schedule (user_id, concept, source_id, mastery_score, next_review_date, interval_days, last_reviewed, review_count)
VALUES (uid, 'K-Means Clustering', '2ece8dcc-8afb-4bab-998c-7a43473f0a72', 85, '2026-10-05T03:03:32.579Z', 3, '2026-09-27T03:03:32.579Z', 9);
INSERT INTO review_schedule (user_id, concept, source_id, mastery_score, next_review_date, interval_days, last_reviewed, review_count)
VALUES (uid, 'Logistic Regression', '2ece8dcc-8afb-4bab-998c-7a43473f0a72', 88, '2026-10-07T03:03:32.579Z', 5, '2026-09-29T03:03:32.579Z', 12);
INSERT INTO review_schedule (user_id, concept, source_id, mastery_score, next_review_date, interval_days, last_reviewed, review_count)
VALUES (uid, 'Linear Regression', '2ece8dcc-8afb-4bab-998c-7a43473f0a72', 92, '2026-10-09T03:03:32.579Z', 7, '2026-09-30T03:03:32.579Z', 18);
INSERT INTO review_schedule (user_id, concept, source_id, mastery_score, next_review_date, interval_days, last_reviewed, review_count)
VALUES (uid, 'Hash Tables', '0a8674a8-1779-464d-9f41-e31a058f4901', 91, '2026-10-09T03:03:32.579Z', 7, '2026-09-30T03:03:32.579Z', 16);
INSERT INTO review_schedule (user_id, concept, source_id, mastery_score, next_review_date, interval_days, last_reviewed, review_count)
VALUES (uid, 'Big-O Notation', '0a8674a8-1779-464d-9f41-e31a058f4901', 96, '2026-10-12T03:03:32.579Z', 10, '2026-10-01T03:03:32.579Z', 22);

-- Progress events (study history)
DELETE FROM progress_events WHERE user_id = uid;
INSERT INTO progress_events (user_id, event_type, source_id, metadata, created_at) VALUES (uid, 'source_upload', '2ece8dcc-8afb-4bab-998c-7a43473f0a72', '{"source_name":"Introduction to Machine Learning - Stanford CS229.pdf"}', '2026-09-14T03:03:32.577Z');
INSERT INTO progress_events (user_id, event_type, source_id, metadata, created_at) VALUES (uid, 'source_analyzed', '2ece8dcc-8afb-4bab-998c-7a43473f0a72', '{"concepts_extracted":6}', '2026-09-14T03:03:32.577Z');
INSERT INTO progress_events (user_id, event_type, source_id, metadata, created_at) VALUES (uid, 'source_upload', '0a8674a8-1779-464d-9f41-e31a058f4901', '{"source_name":"Data Structures and Algorithms - CLRS 4th Edition.pdf"}', '2026-09-17T03:03:32.578Z');
INSERT INTO progress_events (user_id, event_type, source_id, metadata, created_at) VALUES (uid, 'source_analyzed', '0a8674a8-1779-464d-9f41-e31a058f4901', '{"concepts_extracted":6}', '2026-09-17T03:03:32.578Z');
INSERT INTO progress_events (user_id, event_type, source_id, metadata, created_at) VALUES (uid, 'source_upload', 'eaed8257-dc4d-4c72-a858-fde87d61395e', '{"source_name":"System Design Interview - Alex Xu Volume 2.pdf"}', '2026-09-20T03:03:32.578Z');
INSERT INTO progress_events (user_id, event_type, source_id, metadata, created_at) VALUES (uid, 'source_analyzed', 'eaed8257-dc4d-4c72-a858-fde87d61395e', '{"concepts_extracted":6}', '2026-09-20T03:03:32.578Z');
INSERT INTO progress_events (user_id, event_type, source_id, metadata, created_at) VALUES (uid, 'source_upload', '3a13dd24-0136-4819-9dfc-a5a752c3bcc2', '{"source_name":"Linear Algebra Done Right - Axler.pdf"}', '2026-09-22T03:03:32.578Z');
INSERT INTO progress_events (user_id, event_type, source_id, metadata, created_at) VALUES (uid, 'source_analyzed', '3a13dd24-0136-4819-9dfc-a5a752c3bcc2', '{"concepts_extracted":6}', '2026-09-22T03:03:32.578Z');
INSERT INTO progress_events (user_id, event_type, source_id, metadata, created_at) VALUES (uid, 'source_upload', '8cad0492-0f9d-4633-b347-d82106966ff2', '{"source_name":"Probability and Statistics for ML - Murphy.pdf"}', '2026-09-25T03:03:32.578Z');
INSERT INTO progress_events (user_id, event_type, source_id, metadata, created_at) VALUES (uid, 'source_analyzed', '8cad0492-0f9d-4633-b347-d82106966ff2', '{"concepts_extracted":6}', '2026-09-25T03:03:32.578Z');
INSERT INTO progress_events (user_id, event_type, source_id, metadata, created_at) VALUES (uid, 'source_upload', '2908ec52-6763-4b83-a10c-79c373ee2c8e', '{"source_name":"Operating Systems - Three Easy Pieces.pdf"}', '2026-09-27T03:03:32.578Z');
INSERT INTO progress_events (user_id, event_type, source_id, metadata, created_at) VALUES (uid, 'source_analyzed', '2908ec52-6763-4b83-a10c-79c373ee2c8e', '{"concepts_extracted":6}', '2026-09-27T03:03:32.578Z');
INSERT INTO progress_events (user_id, event_type, source_id, metadata, created_at) VALUES (uid, 'source_upload', 'dcbfeec2-0b15-4835-994c-b437cbe1559e', '{"source_name":"Week 3 Lecture Notes - Neural Architecture Search.pdf"}', '2026-09-29T03:03:32.578Z');
INSERT INTO progress_events (user_id, event_type, source_id, metadata, created_at) VALUES (uid, 'source_analyzed', 'dcbfeec2-0b15-4835-994c-b437cbe1559e', '{"concepts_extracted":6}', '2026-09-29T03:03:32.578Z');
INSERT INTO progress_events (user_id, event_type, source_id, metadata, created_at) VALUES (uid, 'source_upload', '38de971d-7cf7-4ec4-8173-a04f305c886c', '{"source_name":"Database Systems - Ramakrishnan & Gehrke.pdf"}', '2026-09-30T03:03:32.578Z');
INSERT INTO progress_events (user_id, event_type, source_id, metadata, created_at) VALUES (uid, 'source_analyzed', '38de971d-7cf7-4ec4-8173-a04f305c886c', '{"concepts_extracted":6}', '2026-09-30T03:03:32.578Z');
INSERT INTO progress_events (user_id, event_type, concept, source_id, score, correct, duration_minutes, metadata, created_at) VALUES (uid, 'practice', 'Neural Networks', '0a8674a8-1779-464d-9f41-e31a058f4901', 71, true, 15, '{}', '2026-10-01T03:03:32.579Z');
INSERT INTO progress_events (user_id, event_type, concept, source_id, score, correct, duration_minutes, metadata, created_at) VALUES (uid, 'flashcard_review', 'Dynamic Programming', 'eaed8257-dc4d-4c72-a858-fde87d61395e', 89, true, 13, '{}', '2026-10-01T03:03:32.579Z');
INSERT INTO progress_events (user_id, event_type, concept, source_id, score, correct, duration_minutes, metadata, created_at) VALUES (uid, 'flashcard_review', 'Dynamic Programming', 'eaed8257-dc4d-4c72-a858-fde87d61395e', 58, false, 29, '{}', '2026-09-30T03:03:32.579Z');
INSERT INTO progress_events (user_id, event_type, concept, source_id, score, correct, duration_minutes, metadata, created_at) VALUES (uid, 'revision_completed', 'Graph Algorithms', '3a13dd24-0136-4819-9dfc-a5a752c3bcc2', 92, true, 14, '{}', '2026-09-30T03:03:32.579Z');
INSERT INTO progress_events (user_id, event_type, concept, source_id, score, correct, duration_minutes, metadata, created_at) VALUES (uid, 'revision_completed', 'Graph Algorithms', '3a13dd24-0136-4819-9dfc-a5a752c3bcc2', 86, true, 27, '{}', '2026-09-29T03:03:32.579Z');
INSERT INTO progress_events (user_id, event_type, concept, source_id, score, correct, duration_minutes, metadata, created_at) VALUES (uid, 'quiz', 'K-Means Clustering', '8cad0492-0f9d-4633-b347-d82106966ff2', 69, false, 20, '{}', '2026-09-29T03:03:32.579Z');
INSERT INTO progress_events (user_id, event_type, concept, source_id, score, correct, duration_minutes, metadata, created_at) VALUES (uid, 'practice', 'Support Vector Machines', '2908ec52-6763-4b83-a10c-79c373ee2c8e', 76, true, 25, '{}', '2026-09-29T03:03:32.579Z');
INSERT INTO progress_events (user_id, event_type, concept, source_id, score, correct, duration_minutes, metadata, created_at) VALUES (uid, 'flashcard_review', 'Hash Tables', 'dcbfeec2-0b15-4835-994c-b437cbe1559e', 68, false, 19, '{}', '2026-09-29T03:03:32.579Z');
INSERT INTO progress_events (user_id, event_type, concept, source_id, score, correct, duration_minutes, metadata, created_at) VALUES (uid, 'quiz', 'K-Means Clustering', '8cad0492-0f9d-4633-b347-d82106966ff2', 70, true, 12, '{}', '2026-09-28T03:03:32.579Z');
INSERT INTO progress_events (user_id, event_type, concept, source_id, score, correct, duration_minutes, metadata, created_at) VALUES (uid, 'practice', 'Support Vector Machines', '2908ec52-6763-4b83-a10c-79c373ee2c8e', 71, true, 21, '{}', '2026-09-28T03:03:32.579Z');
INSERT INTO progress_events (user_id, event_type, concept, source_id, score, correct, duration_minutes, metadata, created_at) VALUES (uid, 'practice', 'Support Vector Machines', '2908ec52-6763-4b83-a10c-79c373ee2c8e', 88, true, 14, '{}', '2026-09-27T03:03:32.579Z');
INSERT INTO progress_events (user_id, event_type, concept, source_id, score, correct, duration_minutes, metadata, created_at) VALUES (uid, 'flashcard_review', 'Hash Tables', 'dcbfeec2-0b15-4835-994c-b437cbe1559e', 59, false, 27, '{}', '2026-09-27T03:03:32.579Z');
INSERT INTO progress_events (user_id, event_type, concept, source_id, score, correct, duration_minutes, metadata, created_at) VALUES (uid, 'revision_completed', 'Load Balancing', '38de971d-7cf7-4ec4-8173-a04f305c886c', 91, true, 19, '{}', '2026-09-27T03:03:32.579Z');
INSERT INTO progress_events (user_id, event_type, concept, source_id, score, correct, duration_minutes, metadata, created_at) VALUES (uid, 'quiz', 'Vector Spaces', '2ece8dcc-8afb-4bab-998c-7a43473f0a72', 84, true, 28, '{}', '2026-09-27T03:03:32.579Z');
INSERT INTO progress_events (user_id, event_type, concept, source_id, score, correct, duration_minutes, metadata, created_at) VALUES (uid, 'flashcard_review', 'Hash Tables', 'dcbfeec2-0b15-4835-994c-b437cbe1559e', 87, true, 27, '{}', '2026-09-26T03:03:32.579Z');
INSERT INTO progress_events (user_id, event_type, concept, source_id, score, correct, duration_minutes, metadata, created_at) VALUES (uid, 'revision_completed', 'Load Balancing', '38de971d-7cf7-4ec4-8173-a04f305c886c', 86, true, 19, '{}', '2026-09-26T03:03:32.579Z');
INSERT INTO progress_events (user_id, event_type, concept, source_id, score, correct, duration_minutes, metadata, created_at) VALUES (uid, 'revision_completed', 'Load Balancing', '38de971d-7cf7-4ec4-8173-a04f305c886c', 90, true, 18, '{}', '2026-09-25T03:03:32.579Z');
INSERT INTO progress_events (user_id, event_type, concept, source_id, score, correct, duration_minutes, metadata, created_at) VALUES (uid, 'quiz', 'Vector Spaces', '2ece8dcc-8afb-4bab-998c-7a43473f0a72', 60, false, 23, '{}', '2026-09-25T03:03:32.579Z');
INSERT INTO progress_events (user_id, event_type, concept, source_id, score, correct, duration_minutes, metadata, created_at) VALUES (uid, 'practice', 'Eigenvalues', '0a8674a8-1779-464d-9f41-e31a058f4901', 66, false, 15, '{}', '2026-09-25T03:03:32.579Z');
INSERT INTO progress_events (user_id, event_type, concept, source_id, score, correct, duration_minutes, metadata, created_at) VALUES (uid, 'flashcard_review', 'Linear Regression', 'eaed8257-dc4d-4c72-a858-fde87d61395e', 85, true, 21, '{}', '2026-09-25T03:03:32.579Z');
INSERT INTO progress_events (user_id, event_type, concept, source_id, score, correct, duration_minutes, metadata, created_at) VALUES (uid, 'quiz', 'Vector Spaces', '2ece8dcc-8afb-4bab-998c-7a43473f0a72', 81, true, 14, '{}', '2026-09-24T03:03:32.579Z');
INSERT INTO progress_events (user_id, event_type, concept, source_id, score, correct, duration_minutes, metadata, created_at) VALUES (uid, 'practice', 'Eigenvalues', '0a8674a8-1779-464d-9f41-e31a058f4901', 68, false, 26, '{}', '2026-09-24T03:03:32.579Z');
INSERT INTO progress_events (user_id, event_type, concept, source_id, score, correct, duration_minutes, metadata, created_at) VALUES (uid, 'practice', 'Eigenvalues', '0a8674a8-1779-464d-9f41-e31a058f4901', 77, true, 21, '{}', '2026-09-23T03:03:32.579Z');
INSERT INTO progress_events (user_id, event_type, concept, source_id, score, correct, duration_minutes, metadata, created_at) VALUES (uid, 'flashcard_review', 'Linear Regression', 'eaed8257-dc4d-4c72-a858-fde87d61395e', 82, true, 20, '{}', '2026-09-23T03:03:32.579Z');
INSERT INTO progress_events (user_id, event_type, concept, source_id, score, correct, duration_minutes, metadata, created_at) VALUES (uid, 'revision_completed', 'Neural Networks', '3a13dd24-0136-4819-9dfc-a5a752c3bcc2', 59, false, 16, '{}', '2026-09-23T03:03:32.579Z');
INSERT INTO progress_events (user_id, event_type, concept, source_id, score, correct, duration_minutes, metadata, created_at) VALUES (uid, 'flashcard_review', 'Linear Regression', 'eaed8257-dc4d-4c72-a858-fde87d61395e', 81, true, 20, '{}', '2026-09-22T03:03:32.579Z');
INSERT INTO progress_events (user_id, event_type, concept, source_id, score, correct, duration_minutes, metadata, created_at) VALUES (uid, 'revision_completed', 'Neural Networks', '3a13dd24-0136-4819-9dfc-a5a752c3bcc2', 92, true, 19, '{}', '2026-09-22T03:03:32.579Z');
INSERT INTO progress_events (user_id, event_type, concept, source_id, score, correct, duration_minutes, metadata, created_at) VALUES (uid, 'quiz', 'Dynamic Programming', '8cad0492-0f9d-4633-b347-d82106966ff2', 60, false, 20, '{}', '2026-09-22T03:03:32.579Z');
INSERT INTO progress_events (user_id, event_type, concept, source_id, score, correct, duration_minutes, metadata, created_at) VALUES (uid, 'revision_completed', 'Neural Networks', '3a13dd24-0136-4819-9dfc-a5a752c3bcc2', 78, true, 14, '{}', '2026-09-21T03:03:32.579Z');
INSERT INTO progress_events (user_id, event_type, concept, source_id, score, correct, duration_minutes, metadata, created_at) VALUES (uid, 'quiz', 'Dynamic Programming', '8cad0492-0f9d-4633-b347-d82106966ff2', 63, false, 22, '{}', '2026-09-21T03:03:32.579Z');
INSERT INTO progress_events (user_id, event_type, concept, source_id, score, correct, duration_minutes, metadata, created_at) VALUES (uid, 'quiz', 'Dynamic Programming', '8cad0492-0f9d-4633-b347-d82106966ff2', 65, false, 24, '{}', '2026-09-20T03:03:32.579Z');
INSERT INTO progress_events (user_id, event_type, concept, source_id, score, correct, duration_minutes, metadata, created_at) VALUES (uid, 'practice', 'Graph Algorithms', '2908ec52-6763-4b83-a10c-79c373ee2c8e', 81, true, 28, '{}', '2026-09-20T03:03:32.579Z');
INSERT INTO progress_events (user_id, event_type, concept, source_id, score, correct, duration_minutes, metadata, created_at) VALUES (uid, 'flashcard_review', 'K-Means Clustering', 'dcbfeec2-0b15-4835-994c-b437cbe1559e', 58, false, 14, '{}', '2026-09-20T03:03:32.579Z');
INSERT INTO progress_events (user_id, event_type, concept, source_id, score, correct, duration_minutes, metadata, created_at) VALUES (uid, 'revision_completed', 'Support Vector Machines', '38de971d-7cf7-4ec4-8173-a04f305c886c', 60, false, 22, '{}', '2026-09-20T03:03:32.579Z');
INSERT INTO progress_events (user_id, event_type, concept, source_id, score, correct, duration_minutes, metadata, created_at) VALUES (uid, 'practice', 'Graph Algorithms', '2908ec52-6763-4b83-a10c-79c373ee2c8e', 60, false, 17, '{}', '2026-09-19T03:03:32.579Z');
INSERT INTO progress_events (user_id, event_type, concept, source_id, score, correct, duration_minutes, metadata, created_at) VALUES (uid, 'flashcard_review', 'K-Means Clustering', 'dcbfeec2-0b15-4835-994c-b437cbe1559e', 66, false, 29, '{}', '2026-09-19T03:03:32.579Z');
INSERT INTO progress_events (user_id, event_type, concept, source_id, score, correct, duration_minutes, metadata, created_at) VALUES (uid, 'flashcard_review', 'K-Means Clustering', 'dcbfeec2-0b15-4835-994c-b437cbe1559e', 91, true, 24, '{}', '2026-09-18T03:03:32.579Z');
INSERT INTO progress_events (user_id, event_type, concept, source_id, score, correct, duration_minutes, metadata, created_at) VALUES (uid, 'revision_completed', 'Support Vector Machines', '38de971d-7cf7-4ec4-8173-a04f305c886c', 82, true, 28, '{}', '2026-09-18T03:03:32.579Z');
INSERT INTO progress_events (user_id, event_type, concept, source_id, score, correct, duration_minutes, metadata, created_at) VALUES (uid, 'quiz', 'Hash Tables', '2ece8dcc-8afb-4bab-998c-7a43473f0a72', 83, true, 19, '{}', '2026-09-18T03:03:32.579Z');
INSERT INTO progress_events (user_id, event_type, concept, source_id, score, correct, duration_minutes, metadata, created_at) VALUES (uid, 'revision_completed', 'Support Vector Machines', '38de971d-7cf7-4ec4-8173-a04f305c886c', 76, true, 23, '{}', '2026-09-17T03:03:32.579Z');
INSERT INTO progress_events (user_id, event_type, concept, source_id, score, correct, duration_minutes, metadata, created_at) VALUES (uid, 'quiz', 'Hash Tables', '2ece8dcc-8afb-4bab-998c-7a43473f0a72', 92, true, 21, '{}', '2026-09-17T03:03:32.579Z');
INSERT INTO progress_events (user_id, event_type, concept, source_id, score, correct, duration_minutes, metadata, created_at) VALUES (uid, 'practice', 'Load Balancing', '0a8674a8-1779-464d-9f41-e31a058f4901', 73, true, 16, '{}', '2026-09-17T03:03:32.579Z');
INSERT INTO progress_events (user_id, event_type, concept, source_id, score, correct, duration_minutes, metadata, created_at) VALUES (uid, 'quiz', 'Hash Tables', '2ece8dcc-8afb-4bab-998c-7a43473f0a72', 76, true, 20, '{}', '2026-09-16T03:03:32.579Z');
INSERT INTO progress_events (user_id, event_type, concept, source_id, score, correct, duration_minutes, metadata, created_at) VALUES (uid, 'practice', 'Load Balancing', '0a8674a8-1779-464d-9f41-e31a058f4901', 87, true, 24, '{}', '2026-09-16T03:03:32.579Z');
INSERT INTO progress_events (user_id, event_type, concept, source_id, score, correct, duration_minutes, metadata, created_at) VALUES (uid, 'practice', 'Load Balancing', '0a8674a8-1779-464d-9f41-e31a058f4901', 74, true, 12, '{}', '2026-09-15T03:03:32.579Z');
INSERT INTO progress_events (user_id, event_type, concept, source_id, score, correct, duration_minutes, metadata, created_at) VALUES (uid, 'flashcard_review', 'Vector Spaces', 'eaed8257-dc4d-4c72-a858-fde87d61395e', 89, true, 28, '{}', '2026-09-15T03:03:32.579Z');
INSERT INTO progress_events (user_id, event_type, concept, source_id, score, correct, duration_minutes, metadata, created_at) VALUES (uid, 'revision_completed', 'Eigenvalues', '3a13dd24-0136-4819-9dfc-a5a752c3bcc2', 78, true, 16, '{}', '2026-09-15T03:03:32.579Z');
INSERT INTO progress_events (user_id, event_type, concept, source_id, score, correct, duration_minutes, metadata, created_at) VALUES (uid, 'quiz', 'Linear Regression', '8cad0492-0f9d-4633-b347-d82106966ff2', 58, false, 22, '{}', '2026-09-15T03:03:32.579Z');
INSERT INTO progress_events (user_id, event_type, concept, source_id, score, correct, duration_minutes, metadata, created_at) VALUES (uid, 'flashcard_review', 'Vector Spaces', 'eaed8257-dc4d-4c72-a858-fde87d61395e', 72, true, 15, '{}', '2026-09-14T03:03:32.579Z');
INSERT INTO progress_events (user_id, event_type, concept, source_id, score, correct, duration_minutes, metadata, created_at) VALUES (uid, 'revision_completed', 'Eigenvalues', '3a13dd24-0136-4819-9dfc-a5a752c3bcc2', 73, true, 10, '{}', '2026-09-14T03:03:32.579Z');
INSERT INTO progress_events (user_id, event_type, concept, source_id, score, correct, duration_minutes, metadata, created_at) VALUES (uid, 'revision_completed', 'Eigenvalues', '3a13dd24-0136-4819-9dfc-a5a752c3bcc2', 81, true, 14, '{}', '2026-09-13T03:03:32.579Z');
INSERT INTO progress_events (user_id, event_type, concept, source_id, score, correct, duration_minutes, metadata, created_at) VALUES (uid, 'quiz', 'Linear Regression', '8cad0492-0f9d-4633-b347-d82106966ff2', 80, true, 11, '{}', '2026-09-13T03:03:32.579Z');
INSERT INTO progress_events (user_id, event_type, concept, source_id, score, correct, duration_minutes, metadata, created_at) VALUES (uid, 'practice', 'Neural Networks', '2908ec52-6763-4b83-a10c-79c373ee2c8e', 85, true, 12, '{}', '2026-09-13T03:03:32.579Z');
INSERT INTO progress_events (user_id, event_type, concept, source_id, score, correct, duration_minutes, metadata, created_at) VALUES (uid, 'quiz', 'Linear Regression', '8cad0492-0f9d-4633-b347-d82106966ff2', 60, false, 28, '{}', '2026-09-12T03:03:32.579Z');
INSERT INTO progress_events (user_id, event_type, concept, source_id, score, correct, duration_minutes, metadata, created_at) VALUES (uid, 'practice', 'Neural Networks', '2908ec52-6763-4b83-a10c-79c373ee2c8e', 76, true, 23, '{}', '2026-09-12T03:03:32.579Z');
INSERT INTO progress_events (user_id, event_type, concept, source_id, score, correct, duration_minutes, metadata, created_at) VALUES (uid, 'practice', 'Neural Networks', '2908ec52-6763-4b83-a10c-79c373ee2c8e', 72, true, 26, '{}', '2026-09-11T03:03:32.579Z');
INSERT INTO progress_events (user_id, event_type, concept, source_id, score, correct, duration_minutes, metadata, created_at) VALUES (uid, 'flashcard_review', 'Dynamic Programming', 'dcbfeec2-0b15-4835-994c-b437cbe1559e', 79, true, 22, '{}', '2026-09-11T03:03:32.579Z');
INSERT INTO progress_events (user_id, event_type, concept, source_id, score, correct, duration_minutes, metadata, created_at) VALUES (uid, 'revision_completed', 'Graph Algorithms', '38de971d-7cf7-4ec4-8173-a04f305c886c', 88, true, 22, '{}', '2026-09-11T03:03:32.579Z');
INSERT INTO progress_events (user_id, event_type, concept, source_id, score, correct, duration_minutes, metadata, created_at) VALUES (uid, 'flashcard_review', 'Dynamic Programming', 'dcbfeec2-0b15-4835-994c-b437cbe1559e', 89, true, 22, '{}', '2026-09-10T03:03:32.579Z');
INSERT INTO progress_events (user_id, event_type, concept, source_id, score, correct, duration_minutes, metadata, created_at) VALUES (uid, 'revision_completed', 'Graph Algorithms', '38de971d-7cf7-4ec4-8173-a04f305c886c', 61, false, 28, '{}', '2026-09-10T03:03:32.579Z');
INSERT INTO progress_events (user_id, event_type, concept, source_id, score, correct, duration_minutes, metadata, created_at) VALUES (uid, 'quiz', 'K-Means Clustering', '2ece8dcc-8afb-4bab-998c-7a43473f0a72', 62, false, 12, '{}', '2026-09-10T03:03:32.579Z');
INSERT INTO progress_events (user_id, event_type, concept, source_id, score, correct, duration_minutes, metadata, created_at) VALUES (uid, 'revision_completed', 'Graph Algorithms', '38de971d-7cf7-4ec4-8173-a04f305c886c', 69, false, 16, '{}', '2026-09-09T03:03:32.579Z');
INSERT INTO progress_events (user_id, event_type, concept, source_id, score, correct, duration_minutes, metadata, created_at) VALUES (uid, 'quiz', 'K-Means Clustering', '2ece8dcc-8afb-4bab-998c-7a43473f0a72', 86, true, 14, '{}', '2026-09-09T03:03:32.579Z');
INSERT INTO progress_events (user_id, event_type, concept, source_id, score, correct, duration_minutes, metadata, created_at) VALUES (uid, 'practice', 'Support Vector Machines', '0a8674a8-1779-464d-9f41-e31a058f4901', 67, false, 14, '{}', '2026-09-09T03:03:32.579Z');
INSERT INTO progress_events (user_id, event_type, concept, source_id, score, correct, duration_minutes, metadata, created_at) VALUES (uid, 'quiz', 'K-Means Clustering', '2ece8dcc-8afb-4bab-998c-7a43473f0a72', 60, false, 26, '{}', '2026-09-08T03:03:32.579Z');
INSERT INTO progress_events (user_id, event_type, concept, source_id, score, correct, duration_minutes, metadata, created_at) VALUES (uid, 'practice', 'Support Vector Machines', '0a8674a8-1779-464d-9f41-e31a058f4901', 70, true, 12, '{}', '2026-09-08T03:03:32.579Z');
INSERT INTO progress_events (user_id, event_type, concept, source_id, score, correct, duration_minutes, metadata, created_at) VALUES (uid, 'practice', 'Support Vector Machines', '0a8674a8-1779-464d-9f41-e31a058f4901', 73, true, 26, '{}', '2026-09-07T03:03:32.579Z');
INSERT INTO progress_events (user_id, event_type, concept, source_id, score, correct, duration_minutes, metadata, created_at) VALUES (uid, 'flashcard_review', 'Hash Tables', 'eaed8257-dc4d-4c72-a858-fde87d61395e', 92, true, 22, '{}', '2026-09-07T03:03:32.579Z');
INSERT INTO progress_events (user_id, event_type, concept, source_id, score, correct, duration_minutes, metadata) VALUES (uid, 'quiz', 'Neural Networks', '2ece8dcc-8afb-4bab-998c-7a43473f0a72', 78, true, 15, '{}');
INSERT INTO progress_events (user_id, event_type, concept, source_id, score, correct, duration_minutes, metadata) VALUES (uid, 'flashcard_review', 'Big-O Notation', '0a8674a8-1779-464d-9f41-e31a058f4901', 95, true, 8, '{}');
INSERT INTO progress_events (user_id, event_type, concept, source_id, score, correct, duration_minutes, metadata) VALUES (uid, 'practice', 'Dynamic Programming', '0a8674a8-1779-464d-9f41-e31a058f4901', 65, false, 25, '{}');

-- Tutoring sessions
DELETE FROM tutoring_sessions WHERE user_id = uid;
INSERT INTO tutoring_sessions (user_id, source_id, topic, duration_minutes, questions_asked, satisfaction_score, created_at) VALUES (uid, '2ece8dcc-8afb-4bab-998c-7a43473f0a72', 'Understanding backpropagation in neural networks', 37, 3, 8, '2026-09-29T03:03:32.579Z');
INSERT INTO tutoring_sessions (user_id, source_id, topic, duration_minutes, questions_asked, satisfaction_score, created_at) VALUES (uid, '0a8674a8-1779-464d-9f41-e31a058f4901', 'Dynamic programming problem-solving strategies', 25, 8, 9, '2026-09-22T03:03:32.579Z');
INSERT INTO tutoring_sessions (user_id, source_id, topic, duration_minutes, questions_asked, satisfaction_score, created_at) VALUES (uid, 'eaed8257-dc4d-4c72-a858-fde87d61395e', 'Graph traversal algorithms comparison', 19, 7, 9, '2026-09-26T03:03:32.579Z');
INSERT INTO tutoring_sessions (user_id, source_id, topic, duration_minutes, questions_asked, satisfaction_score, created_at) VALUES (uid, '3a13dd24-0136-4819-9dfc-a5a752c3bcc2', 'Support vector machine kernel tricks', 43, 4, 8, '2026-09-14T03:03:32.579Z');
INSERT INTO tutoring_sessions (user_id, source_id, topic, duration_minutes, questions_asked, satisfaction_score, created_at) VALUES (uid, '8cad0492-0f9d-4633-b347-d82106966ff2', 'Matrix factorization for recommendation systems', 20, 7, 9, '2026-09-28T03:03:32.579Z');
INSERT INTO tutoring_sessions (user_id, source_id, topic, duration_minutes, questions_asked, satisfaction_score, created_at) VALUES (uid, '2908ec52-6763-4b83-a10c-79c373ee2c8e', 'Load balancing strategies for distributed systems', 26, 7, 8, '2026-09-16T03:03:32.579Z');
INSERT INTO tutoring_sessions (user_id, source_id, topic, duration_minutes, questions_asked, satisfaction_score, created_at) VALUES (uid, 'dcbfeec2-0b15-4835-994c-b437cbe1559e', 'Eigenvalue decomposition applications', 22, 5, 7, '2026-09-30T03:03:32.579Z');
INSERT INTO tutoring_sessions (user_id, source_id, topic, duration_minutes, questions_asked, satisfaction_score, created_at) VALUES (uid, '38de971d-7cf7-4ec4-8173-a04f305c886c', 'SQL query optimization techniques', 36, 7, 9, '2026-09-17T03:03:32.579Z');
INSERT INTO tutoring_sessions (user_id, source_id, topic, duration_minutes, questions_asked, satisfaction_score, created_at) VALUES (uid, '2ece8dcc-8afb-4bab-998c-7a43473f0a72', 'Probability distributions in machine learning', 46, 4, 8, '2026-09-25T03:03:32.579Z');
INSERT INTO tutoring_sessions (user_id, source_id, topic, duration_minutes, questions_asked, satisfaction_score, created_at) VALUES (uid, '0a8674a8-1779-464d-9f41-e31a058f4901', 'Greedy algorithm design patterns', 35, 2, 7, '2026-09-16T03:03:32.579Z');
INSERT INTO tutoring_sessions (user_id, source_id, topic, duration_minutes, questions_asked, satisfaction_score, created_at) VALUES (uid, 'eaed8257-dc4d-4c72-a858-fde87d61395e', 'Understanding backpropagation in neural networks', 35, 2, 9, '2026-09-19T03:03:32.579Z');
INSERT INTO tutoring_sessions (user_id, source_id, topic, duration_minutes, questions_asked, satisfaction_score, created_at) VALUES (uid, '3a13dd24-0136-4819-9dfc-a5a752c3bcc2', 'Dynamic programming problem-solving strategies', 45, 5, 7, '2026-09-29T03:03:32.579Z');
INSERT INTO tutoring_sessions (user_id, source_id, topic, duration_minutes, questions_asked, satisfaction_score, created_at) VALUES (uid, '8cad0492-0f9d-4633-b347-d82106966ff2', 'Graph traversal algorithms comparison', 45, 4, 9, '2026-09-20T03:03:32.579Z');
INSERT INTO tutoring_sessions (user_id, source_id, topic, duration_minutes, questions_asked, satisfaction_score, created_at) VALUES (uid, '2908ec52-6763-4b83-a10c-79c373ee2c8e', 'Support vector machine kernel tricks', 15, 2, 7, '2026-09-30T03:03:32.579Z');
INSERT INTO tutoring_sessions (user_id, source_id, topic, duration_minutes, questions_asked, satisfaction_score, created_at) VALUES (uid, 'dcbfeec2-0b15-4835-994c-b437cbe1559e', 'Matrix factorization for recommendation systems', 23, 8, 8, '2026-09-25T03:03:32.579Z');
INSERT INTO tutoring_sessions (user_id, source_id, topic, duration_minutes, questions_asked, satisfaction_score, created_at) VALUES (uid, '38de971d-7cf7-4ec4-8173-a04f305c886c', 'Load balancing strategies for distributed systems', 32, 4, 7, '2026-09-25T03:03:32.579Z');
INSERT INTO tutoring_sessions (user_id, source_id, topic, duration_minutes, questions_asked, satisfaction_score, created_at) VALUES (uid, '2ece8dcc-8afb-4bab-998c-7a43473f0a72', 'Eigenvalue decomposition applications', 37, 2, 8, '2026-09-21T03:03:32.579Z');
INSERT INTO tutoring_sessions (user_id, source_id, topic, duration_minutes, questions_asked, satisfaction_score, created_at) VALUES (uid, '0a8674a8-1779-464d-9f41-e31a058f4901', 'SQL query optimization techniques', 25, 3, 8, '2026-09-15T03:03:32.579Z');
INSERT INTO tutoring_sessions (user_id, source_id, topic, duration_minutes, questions_asked, satisfaction_score, created_at) VALUES (uid, 'eaed8257-dc4d-4c72-a858-fde87d61395e', 'Probability distributions in machine learning', 44, 6, 8, '2026-09-27T03:03:32.579Z');
INSERT INTO tutoring_sessions (user_id, source_id, topic, duration_minutes, questions_asked, satisfaction_score, created_at) VALUES (uid, '3a13dd24-0136-4819-9dfc-a5a752c3bcc2', 'Greedy algorithm design patterns', 19, 6, 9, '2026-09-30T03:03:32.579Z');

-- Practice attempts
DELETE FROM practice_attempts WHERE user_id = uid;
INSERT INTO practice_attempts (user_id, concept, source_id, score, correct, time_taken, created_at) VALUES (uid, 'Linear Regression', '2ece8dcc-8afb-4bab-998c-7a43473f0a72', 52, false, 33, '2026-09-28T03:03:32.579Z');
INSERT INTO practice_attempts (user_id, concept, source_id, score, correct, time_taken, created_at) VALUES (uid, 'Neural Networks', '0a8674a8-1779-464d-9f41-e31a058f4901', 79, true, 78, '2026-09-24T03:03:32.579Z');
INSERT INTO practice_attempts (user_id, concept, source_id, score, correct, time_taken, created_at) VALUES (uid, 'Dynamic Programming', 'eaed8257-dc4d-4c72-a858-fde87d61395e', 91, true, 106, '2026-09-23T03:03:32.579Z');
INSERT INTO practice_attempts (user_id, concept, source_id, score, correct, time_taken, created_at) VALUES (uid, 'Graph Algorithms', '2ece8dcc-8afb-4bab-998c-7a43473f0a72', 77, true, 100, '2026-09-30T03:03:32.579Z');
INSERT INTO practice_attempts (user_id, concept, source_id, score, correct, time_taken, created_at) VALUES (uid, 'Hash Tables', '0a8674a8-1779-464d-9f41-e31a058f4901', 79, true, 91, '2026-09-17T03:03:32.579Z');
INSERT INTO practice_attempts (user_id, concept, source_id, score, correct, time_taken, created_at) VALUES (uid, 'Support Vector Machines', 'eaed8257-dc4d-4c72-a858-fde87d61395e', 53, false, 33, '2026-09-29T03:03:32.579Z');
INSERT INTO practice_attempts (user_id, concept, source_id, score, correct, time_taken, created_at) VALUES (uid, 'Eigenvalues', '2ece8dcc-8afb-4bab-998c-7a43473f0a72', 76, true, 57, '2026-09-16T03:03:32.579Z');
INSERT INTO practice_attempts (user_id, concept, source_id, score, correct, time_taken, created_at) VALUES (uid, 'Load Balancing', '0a8674a8-1779-464d-9f41-e31a058f4901', 82, true, 58, '2026-09-16T03:03:32.579Z');
INSERT INTO practice_attempts (user_id, concept, source_id, score, correct, time_taken, created_at) VALUES (uid, 'Linear Regression', 'eaed8257-dc4d-4c72-a858-fde87d61395e', 54, false, 64, '2026-09-18T03:03:32.579Z');
INSERT INTO practice_attempts (user_id, concept, source_id, score, correct, time_taken, created_at) VALUES (uid, 'Neural Networks', '2ece8dcc-8afb-4bab-998c-7a43473f0a72', 77, true, 34, '2026-09-28T03:03:32.579Z');
INSERT INTO practice_attempts (user_id, concept, source_id, score, correct, time_taken, created_at) VALUES (uid, 'Dynamic Programming', '0a8674a8-1779-464d-9f41-e31a058f4901', 74, true, 113, '2026-09-22T03:03:32.579Z');
INSERT INTO practice_attempts (user_id, concept, source_id, score, correct, time_taken, created_at) VALUES (uid, 'Graph Algorithms', 'eaed8257-dc4d-4c72-a858-fde87d61395e', 65, false, 36, '2026-09-26T03:03:32.579Z');
INSERT INTO practice_attempts (user_id, concept, source_id, score, correct, time_taken, created_at) VALUES (uid, 'Hash Tables', '2ece8dcc-8afb-4bab-998c-7a43473f0a72', 59, false, 42, '2026-09-29T03:03:32.579Z');
INSERT INTO practice_attempts (user_id, concept, source_id, score, correct, time_taken, created_at) VALUES (uid, 'Support Vector Machines', '0a8674a8-1779-464d-9f41-e31a058f4901', 71, true, 104, '2026-09-19T03:03:32.579Z');
INSERT INTO practice_attempts (user_id, concept, source_id, score, correct, time_taken, created_at) VALUES (uid, 'Eigenvalues', 'eaed8257-dc4d-4c72-a858-fde87d61395e', 79, true, 116, '2026-09-25T03:03:32.579Z');
INSERT INTO practice_attempts (user_id, concept, source_id, score, correct, time_taken, created_at) VALUES (uid, 'Load Balancing', '2ece8dcc-8afb-4bab-998c-7a43473f0a72', 59, false, 30, '2026-09-27T03:03:32.579Z');
INSERT INTO practice_attempts (user_id, concept, source_id, score, correct, time_taken, created_at) VALUES (uid, 'Linear Regression', '0a8674a8-1779-464d-9f41-e31a058f4901', 87, true, 82, '2026-09-24T03:03:32.579Z');
INSERT INTO practice_attempts (user_id, concept, source_id, score, correct, time_taken, created_at) VALUES (uid, 'Neural Networks', 'eaed8257-dc4d-4c72-a858-fde87d61395e', 64, false, 73, '2026-09-29T03:03:32.579Z');
INSERT INTO practice_attempts (user_id, concept, source_id, score, correct, time_taken, created_at) VALUES (uid, 'Dynamic Programming', '2ece8dcc-8afb-4bab-998c-7a43473f0a72', 52, false, 60, '2026-09-24T03:03:32.579Z');
INSERT INTO practice_attempts (user_id, concept, source_id, score, correct, time_taken, created_at) VALUES (uid, 'Graph Algorithms', '0a8674a8-1779-464d-9f41-e31a058f4901', 79, true, 48, '2026-09-25T03:03:32.579Z');
INSERT INTO practice_attempts (user_id, concept, source_id, score, correct, time_taken, created_at) VALUES (uid, 'Hash Tables', 'eaed8257-dc4d-4c72-a858-fde87d61395e', 81, true, 51, '2026-09-18T03:03:32.579Z');
INSERT INTO practice_attempts (user_id, concept, source_id, score, correct, time_taken, created_at) VALUES (uid, 'Support Vector Machines', '2ece8dcc-8afb-4bab-998c-7a43473f0a72', 60, false, 90, '2026-09-21T03:03:32.579Z');
INSERT INTO practice_attempts (user_id, concept, source_id, score, correct, time_taken, created_at) VALUES (uid, 'Eigenvalues', '0a8674a8-1779-464d-9f41-e31a058f4901', 71, true, 98, '2026-09-28T03:03:32.579Z');
INSERT INTO practice_attempts (user_id, concept, source_id, score, correct, time_taken, created_at) VALUES (uid, 'Load Balancing', 'eaed8257-dc4d-4c72-a858-fde87d61395e', 69, false, 44, '2026-09-29T03:03:32.579Z');
INSERT INTO practice_attempts (user_id, concept, source_id, score, correct, time_taken, created_at) VALUES (uid, 'Linear Regression', '2ece8dcc-8afb-4bab-998c-7a43473f0a72', 56, false, 69, '2026-10-01T03:03:32.579Z');
INSERT INTO practice_attempts (user_id, concept, source_id, score, correct, time_taken, created_at) VALUES (uid, 'Neural Networks', '0a8674a8-1779-464d-9f41-e31a058f4901', 65, false, 30, '2026-09-29T03:03:32.579Z');
INSERT INTO practice_attempts (user_id, concept, source_id, score, correct, time_taken, created_at) VALUES (uid, 'Dynamic Programming', 'eaed8257-dc4d-4c72-a858-fde87d61395e', 83, true, 98, '2026-09-28T03:03:32.579Z');
INSERT INTO practice_attempts (user_id, concept, source_id, score, correct, time_taken, created_at) VALUES (uid, 'Graph Algorithms', '2ece8dcc-8afb-4bab-998c-7a43473f0a72', 76, true, 86, '2026-09-29T03:03:32.579Z');
INSERT INTO practice_attempts (user_id, concept, source_id, score, correct, time_taken, created_at) VALUES (uid, 'Hash Tables', '0a8674a8-1779-464d-9f41-e31a058f4901', 76, true, 52, '2026-09-28T03:03:32.579Z');
INSERT INTO practice_attempts (user_id, concept, source_id, score, correct, time_taken, created_at) VALUES (uid, 'Support Vector Machines', 'eaed8257-dc4d-4c72-a858-fde87d61395e', 55, false, 48, '2026-09-20T03:03:32.579Z');
INSERT INTO practice_attempts (user_id, concept, source_id, score, correct, time_taken, created_at) VALUES (uid, 'Eigenvalues', '2ece8dcc-8afb-4bab-998c-7a43473f0a72', 86, true, 83, '2026-09-27T03:03:32.579Z');
INSERT INTO practice_attempts (user_id, concept, source_id, score, correct, time_taken, created_at) VALUES (uid, 'Load Balancing', '0a8674a8-1779-464d-9f41-e31a058f4901', 79, true, 57, '2026-10-01T03:03:32.579Z');
INSERT INTO practice_attempts (user_id, concept, source_id, score, correct, time_taken, created_at) VALUES (uid, 'Linear Regression', 'eaed8257-dc4d-4c72-a858-fde87d61395e', 79, true, 71, '2026-09-16T03:03:32.579Z');
INSERT INTO practice_attempts (user_id, concept, source_id, score, correct, time_taken, created_at) VALUES (uid, 'Neural Networks', '2ece8dcc-8afb-4bab-998c-7a43473f0a72', 88, true, 45, '2026-09-27T03:03:32.579Z');
INSERT INTO practice_attempts (user_id, concept, source_id, score, correct, time_taken, created_at) VALUES (uid, 'Dynamic Programming', '0a8674a8-1779-464d-9f41-e31a058f4901', 66, false, 30, '2026-09-25T03:03:32.579Z');
INSERT INTO practice_attempts (user_id, concept, source_id, score, correct, time_taken, created_at) VALUES (uid, 'Graph Algorithms', 'eaed8257-dc4d-4c72-a858-fde87d61395e', 56, false, 99, '2026-09-30T03:03:32.579Z');
INSERT INTO practice_attempts (user_id, concept, source_id, score, correct, time_taken, created_at) VALUES (uid, 'Hash Tables', '2ece8dcc-8afb-4bab-998c-7a43473f0a72', 83, true, 94, '2026-09-20T03:03:32.579Z');
INSERT INTO practice_attempts (user_id, concept, source_id, score, correct, time_taken, created_at) VALUES (uid, 'Support Vector Machines', '0a8674a8-1779-464d-9f41-e31a058f4901', 73, true, 118, '2026-09-23T03:03:32.579Z');
INSERT INTO practice_attempts (user_id, concept, source_id, score, correct, time_taken, created_at) VALUES (uid, 'Eigenvalues', 'eaed8257-dc4d-4c72-a858-fde87d61395e', 68, false, 36, '2026-09-29T03:03:32.580Z');
INSERT INTO practice_attempts (user_id, concept, source_id, score, correct, time_taken, created_at) VALUES (uid, 'Load Balancing', '2ece8dcc-8afb-4bab-998c-7a43473f0a72', 78, true, 40, '2026-10-01T03:03:32.580Z');
INSERT INTO practice_attempts (user_id, concept, source_id, score, correct, time_taken, created_at) VALUES (uid, 'Linear Regression', '0a8674a8-1779-464d-9f41-e31a058f4901', 68, false, 79, '2026-09-27T03:03:32.580Z');
INSERT INTO practice_attempts (user_id, concept, source_id, score, correct, time_taken, created_at) VALUES (uid, 'Neural Networks', 'eaed8257-dc4d-4c72-a858-fde87d61395e', 69, false, 30, '2026-09-18T03:03:32.580Z');
INSERT INTO practice_attempts (user_id, concept, source_id, score, correct, time_taken, created_at) VALUES (uid, 'Dynamic Programming', '2ece8dcc-8afb-4bab-998c-7a43473f0a72', 91, true, 112, '2026-09-23T03:03:32.580Z');
INSERT INTO practice_attempts (user_id, concept, source_id, score, correct, time_taken, created_at) VALUES (uid, 'Graph Algorithms', '0a8674a8-1779-464d-9f41-e31a058f4901', 64, false, 84, '2026-09-26T03:03:32.580Z');
INSERT INTO practice_attempts (user_id, concept, source_id, score, correct, time_taken, created_at) VALUES (uid, 'Hash Tables', 'eaed8257-dc4d-4c72-a858-fde87d61395e', 69, false, 79, '2026-09-20T03:03:32.580Z');

-- Quiz results
DELETE FROM quiz_results WHERE user_id = uid;
INSERT INTO quiz_results (user_id, source_id, topic, score, total_questions, correct_answers, time_taken, created_at) VALUES (uid, '2ece8dcc-8afb-4bab-998c-7a43473f0a72', 'Machine Learning Fundamentals', 80, 10, 8, 12, '2026-09-19T03:03:32.580Z');
INSERT INTO quiz_results (user_id, source_id, topic, score, total_questions, correct_answers, time_taken, created_at) VALUES (uid, '0a8674a8-1779-464d-9f41-e31a058f4901', 'Algorithm Analysis', 71, 10, 7, 6, '2026-09-14T03:03:32.580Z');
INSERT INTO quiz_results (user_id, source_id, topic, score, total_questions, correct_answers, time_taken, created_at) VALUES (uid, 'eaed8257-dc4d-4c72-a858-fde87d61395e', 'System Design Patterns', 73, 10, 7, 10, '2026-09-24T03:03:32.580Z');
INSERT INTO quiz_results (user_id, source_id, topic, score, total_questions, correct_answers, time_taken, created_at) VALUES (uid, '3a13dd24-0136-4819-9dfc-a5a752c3bcc2', 'Linear Algebra', 84, 10, 8, 14, '2026-09-16T03:03:32.580Z');
INSERT INTO quiz_results (user_id, source_id, topic, score, total_questions, correct_answers, time_taken, created_at) VALUES (uid, '8cad0492-0f9d-4633-b347-d82106966ff2', 'Probability Theory', 92, 10, 9, 12, '2026-09-14T03:03:32.580Z');
INSERT INTO quiz_results (user_id, source_id, topic, score, total_questions, correct_answers, time_taken, created_at) VALUES (uid, '2908ec52-6763-4b83-a10c-79c373ee2c8e', 'Operating Systems', 60, 10, 6, 12, '2026-09-24T03:03:32.580Z');
INSERT INTO quiz_results (user_id, source_id, topic, score, total_questions, correct_answers, time_taken, created_at) VALUES (uid, 'dcbfeec2-0b15-4835-994c-b437cbe1559e', 'Database Design', 74, 10, 7, 5, '2026-09-18T03:03:32.580Z');
INSERT INTO quiz_results (user_id, source_id, topic, score, total_questions, correct_answers, time_taken, created_at) VALUES (uid, '38de971d-7cf7-4ec4-8173-a04f305c886c', 'Machine Learning Fundamentals', 66, 10, 7, 12, '2026-09-18T03:03:32.580Z');
INSERT INTO quiz_results (user_id, source_id, topic, score, total_questions, correct_answers, time_taken, created_at) VALUES (uid, '2ece8dcc-8afb-4bab-998c-7a43473f0a72', 'Algorithm Analysis', 60, 10, 6, 8, '2026-09-26T03:03:32.580Z');
INSERT INTO quiz_results (user_id, source_id, topic, score, total_questions, correct_answers, time_taken, created_at) VALUES (uid, '0a8674a8-1779-464d-9f41-e31a058f4901', 'System Design Patterns', 84, 10, 8, 9, '2026-09-15T03:03:32.580Z');
INSERT INTO quiz_results (user_id, source_id, topic, score, total_questions, correct_answers, time_taken, created_at) VALUES (uid, 'eaed8257-dc4d-4c72-a858-fde87d61395e', 'Linear Algebra', 63, 10, 6, 16, '2026-09-16T03:03:32.580Z');
INSERT INTO quiz_results (user_id, source_id, topic, score, total_questions, correct_answers, time_taken, created_at) VALUES (uid, '3a13dd24-0136-4819-9dfc-a5a752c3bcc2', 'Probability Theory', 93, 10, 9, 11, '2026-09-18T03:03:32.580Z');
INSERT INTO quiz_results (user_id, source_id, topic, score, total_questions, correct_answers, time_taken, created_at) VALUES (uid, '8cad0492-0f9d-4633-b347-d82106966ff2', 'Operating Systems', 93, 10, 9, 5, '2026-09-27T03:03:32.580Z');
INSERT INTO quiz_results (user_id, source_id, topic, score, total_questions, correct_answers, time_taken, created_at) VALUES (uid, '2908ec52-6763-4b83-a10c-79c373ee2c8e', 'Database Design', 66, 10, 7, 16, '2026-10-01T03:03:32.580Z');
INSERT INTO quiz_results (user_id, source_id, topic, score, total_questions, correct_answers, time_taken, created_at) VALUES (uid, 'dcbfeec2-0b15-4835-994c-b437cbe1559e', 'Machine Learning Fundamentals', 85, 10, 9, 5, '2026-09-28T03:03:32.580Z');

-- Analytics snapshots (8 weekly)
DELETE FROM analytics_snapshots WHERE user_id = uid;
INSERT INTO analytics_snapshots (user_id, period, snapshot_date, study_hours, quiz_accuracy, revision_consistency, topics_mastered, topics_total, learning_velocity, data, created_at)
VALUES (uid, 'weekly', '2026-08-14', 10.5, 55, 45, 3, 18, 2, '{"events":20,"quizzes":6,"tutorSessions":3}', '2026-08-14T03:03:32.580Z');
INSERT INTO analytics_snapshots (user_id, period, snapshot_date, study_hours, quiz_accuracy, revision_consistency, topics_mastered, topics_total, learning_velocity, data, created_at)
VALUES (uid, 'weekly', '2026-08-21', 10.0, 59, 51, 4, 18, 3, '{"events":20,"quizzes":6,"tutorSessions":3}', '2026-08-21T03:03:32.580Z');
INSERT INTO analytics_snapshots (user_id, period, snapshot_date, study_hours, quiz_accuracy, revision_consistency, topics_mastered, topics_total, learning_velocity, data, created_at)
VALUES (uid, 'weekly', '2026-08-28', 9.5, 63, 57, 5, 18, 4, '{"events":20,"quizzes":6,"tutorSessions":3}', '2026-08-28T03:03:32.580Z');
INSERT INTO analytics_snapshots (user_id, period, snapshot_date, study_hours, quiz_accuracy, revision_consistency, topics_mastered, topics_total, learning_velocity, data, created_at)
VALUES (uid, 'weekly', '2026-09-04', 9.0, 67, 63, 6, 18, 2, '{"events":20,"quizzes":6,"tutorSessions":3}', '2026-09-04T03:03:32.580Z');
INSERT INTO analytics_snapshots (user_id, period, snapshot_date, study_hours, quiz_accuracy, revision_consistency, topics_mastered, topics_total, learning_velocity, data, created_at)
VALUES (uid, 'weekly', '2026-09-11', 8.5, 71, 69, 7, 18, 3, '{"events":20,"quizzes":6,"tutorSessions":3}', '2026-09-11T03:03:32.580Z');
INSERT INTO analytics_snapshots (user_id, period, snapshot_date, study_hours, quiz_accuracy, revision_consistency, topics_mastered, topics_total, learning_velocity, data, created_at)
VALUES (uid, 'weekly', '2026-09-18', 8.0, 75, 75, 8, 18, 4, '{"events":20,"quizzes":6,"tutorSessions":3}', '2026-09-18T03:03:32.580Z');
INSERT INTO analytics_snapshots (user_id, period, snapshot_date, study_hours, quiz_accuracy, revision_consistency, topics_mastered, topics_total, learning_velocity, data, created_at)
VALUES (uid, 'weekly', '2026-09-25', 7.5, 79, 81, 9, 18, 2, '{"events":20,"quizzes":6,"tutorSessions":3}', '2026-09-25T03:03:32.580Z');
INSERT INTO analytics_snapshots (user_id, period, snapshot_date, study_hours, quiz_accuracy, revision_consistency, topics_mastered, topics_total, learning_velocity, data, created_at)
VALUES (uid, 'weekly', '2026-10-02', 7.0, 83, 87, 10, 18, 3, '{"events":20,"quizzes":6,"tutorSessions":3}', '2026-10-02T03:03:32.580Z');

-- Progress table
DELETE FROM progress WHERE user_id = uid;
INSERT INTO progress (user_id, subject, completion_percentage, last_updated) VALUES (uid, 'Machine Learning', 68, '2026-10-01T03:03:32.580Z');
INSERT INTO progress (user_id, subject, completion_percentage, last_updated) VALUES (uid, 'Data Structures & Algorithms', 75, '2026-09-30T03:03:32.580Z');
INSERT INTO progress (user_id, subject, completion_percentage, last_updated) VALUES (uid, 'System Design', 72, '2026-09-29T03:03:32.580Z');
INSERT INTO progress (user_id, subject, completion_percentage, last_updated) VALUES (uid, 'Mathematics', 70, '2026-10-01T03:03:32.580Z');

-- Study analytics (30 days)
DELETE FROM study_analytics WHERE user_id = uid;
INSERT INTO study_analytics (user_id, date, study_minutes, sessions, topics_covered, quiz_score) VALUES (uid, '2026-10-02', 40, 3, 2, 70);
INSERT INTO study_analytics (user_id, date, study_minutes, sessions, topics_covered, quiz_score) VALUES (uid, '2026-10-01', 97, 2, 2, 68);
INSERT INTO study_analytics (user_id, date, study_minutes, sessions, topics_covered, quiz_score) VALUES (uid, '2026-09-30', 62, 2, 3, 82);
INSERT INTO study_analytics (user_id, date, study_minutes, sessions, topics_covered, quiz_score) VALUES (uid, '2026-09-29', 112, 2, 3, 68);
INSERT INTO study_analytics (user_id, date, study_minutes, sessions, topics_covered, quiz_score) VALUES (uid, '2026-09-28', 106, 3, 1, 93);
INSERT INTO study_analytics (user_id, date, study_minutes, sessions, topics_covered, quiz_score) VALUES (uid, '2026-09-27', 54, 1, 3, 92);
INSERT INTO study_analytics (user_id, date, study_minutes, sessions, topics_covered, quiz_score) VALUES (uid, '2026-09-26', 94, 2, 2, 77);
INSERT INTO study_analytics (user_id, date, study_minutes, sessions, topics_covered, quiz_score) VALUES (uid, '2026-09-25', 105, 3, 3, 70);
INSERT INTO study_analytics (user_id, date, study_minutes, sessions, topics_covered, quiz_score) VALUES (uid, '2026-09-24', 66, 3, 2, 86);
INSERT INTO study_analytics (user_id, date, study_minutes, sessions, topics_covered, quiz_score) VALUES (uid, '2026-09-23', 108, 3, 2, 71);
INSERT INTO study_analytics (user_id, date, study_minutes, sessions, topics_covered, quiz_score) VALUES (uid, '2026-09-22', 78, 2, 3, 85);
INSERT INTO study_analytics (user_id, date, study_minutes, sessions, topics_covered, quiz_score) VALUES (uid, '2026-09-21', 103, 3, 1, 92);
INSERT INTO study_analytics (user_id, date, study_minutes, sessions, topics_covered, quiz_score) VALUES (uid, '2026-09-20', 64, 2, 1, 92);
INSERT INTO study_analytics (user_id, date, study_minutes, sessions, topics_covered, quiz_score) VALUES (uid, '2026-09-19', 94, 1, 2, 77);
INSERT INTO study_analytics (user_id, date, study_minutes, sessions, topics_covered, quiz_score) VALUES (uid, '2026-09-18', 72, 3, 2, 67);
INSERT INTO study_analytics (user_id, date, study_minutes, sessions, topics_covered, quiz_score) VALUES (uid, '2026-09-17', 87, 3, 1, 70);
INSERT INTO study_analytics (user_id, date, study_minutes, sessions, topics_covered, quiz_score) VALUES (uid, '2026-09-16', 52, 3, 1, 67);
INSERT INTO study_analytics (user_id, date, study_minutes, sessions, topics_covered, quiz_score) VALUES (uid, '2026-09-15', 39, 1, 3, 88);
INSERT INTO study_analytics (user_id, date, study_minutes, sessions, topics_covered, quiz_score) VALUES (uid, '2026-09-14', 102, 3, 1, 82);
INSERT INTO study_analytics (user_id, date, study_minutes, sessions, topics_covered, quiz_score) VALUES (uid, '2026-09-13', 38, 3, 2, 77);
INSERT INTO study_analytics (user_id, date, study_minutes, sessions, topics_covered, quiz_score) VALUES (uid, '2026-09-12', 83, 1, 2, 80);
INSERT INTO study_analytics (user_id, date, study_minutes, sessions, topics_covered, quiz_score) VALUES (uid, '2026-09-11', 107, 3, 3, 79);
INSERT INTO study_analytics (user_id, date, study_minutes, sessions, topics_covered, quiz_score) VALUES (uid, '2026-09-10', 65, 1, 1, 88);
INSERT INTO study_analytics (user_id, date, study_minutes, sessions, topics_covered, quiz_score) VALUES (uid, '2026-09-09', 35, 3, 3, 78);
INSERT INTO study_analytics (user_id, date, study_minutes, sessions, topics_covered, quiz_score) VALUES (uid, '2026-09-08', 89, 2, 3, 80);
INSERT INTO study_analytics (user_id, date, study_minutes, sessions, topics_covered, quiz_score) VALUES (uid, '2026-09-07', 110, 3, 3, 94);
INSERT INTO study_analytics (user_id, date, study_minutes, sessions, topics_covered, quiz_score) VALUES (uid, '2026-09-06', 65, 1, 1, 83);
INSERT INTO study_analytics (user_id, date, study_minutes, sessions, topics_covered, quiz_score) VALUES (uid, '2026-09-05', 117, 2, 3, 89);
INSERT INTO study_analytics (user_id, date, study_minutes, sessions, topics_covered, quiz_score) VALUES (uid, '2026-09-04', 92, 3, 3, 71);
INSERT INTO study_analytics (user_id, date, study_minutes, sessions, topics_covered, quiz_score) VALUES (uid, '2026-09-03', 92, 1, 3, 83);

-- Token usage logs
DELETE FROM token_usage_logs WHERE user_id = uid;
INSERT INTO token_usage_logs (user_id, request_id, provider, model, endpoint, prompt_tokens, completion_tokens, total_tokens, estimated_cost_usd, latency_ms, compression_applied, compression_ratio, success, created_at) VALUES (uid, 'demo-req-0', 'gemini', 'gemini-1.5-flash', '/tutor/agent', 202, 343, 545, 0.000818, 1648, true, 0.75, true, '2026-09-20T03:03:32.580Z');
INSERT INTO token_usage_logs (user_id, request_id, provider, model, endpoint, prompt_tokens, completion_tokens, total_tokens, estimated_cost_usd, latency_ms, compression_applied, compression_ratio, success, created_at) VALUES (uid, 'demo-req-1', 'gemini', 'gemini-1.5-pro', '/tutor/orchestrator', 794, 349, 1143, 0.001715, 579, false, 0.75, true, '2026-10-02T03:03:32.580Z');
INSERT INTO token_usage_logs (user_id, request_id, provider, model, endpoint, prompt_tokens, completion_tokens, total_tokens, estimated_cost_usd, latency_ms, compression_applied, compression_ratio, success, created_at) VALUES (uid, 'demo-req-2', 'gemini', 'gemini-1.5-flash', '/chat', 529, 100, 629, 0.000944, 748, true, 0.75, true, '2026-09-28T03:03:32.580Z');
INSERT INTO token_usage_logs (user_id, request_id, provider, model, endpoint, prompt_tokens, completion_tokens, total_tokens, estimated_cost_usd, latency_ms, compression_applied, compression_ratio, success, created_at) VALUES (uid, 'demo-req-3', 'gemini', 'gemini-1.5-pro', '/sources/analyze', 369, 165, 534, 0.000801, 661, false, 0.75, true, '2026-09-23T03:03:32.580Z');
INSERT INTO token_usage_logs (user_id, request_id, provider, model, endpoint, prompt_tokens, completion_tokens, total_tokens, estimated_cost_usd, latency_ms, compression_applied, compression_ratio, success, created_at) VALUES (uid, 'demo-req-4', 'gemini', 'gemini-1.5-flash', '/tutor/agent', 659, 287, 946, 0.001419, 2062, true, 0.75, true, '2026-09-19T03:03:32.580Z');
INSERT INTO token_usage_logs (user_id, request_id, provider, model, endpoint, prompt_tokens, completion_tokens, total_tokens, estimated_cost_usd, latency_ms, compression_applied, compression_ratio, success, created_at) VALUES (uid, 'demo-req-5', 'gemini', 'gemini-1.5-pro', '/tutor/orchestrator', 670, 330, 1000, 0.001500, 2001, false, 0.75, true, '2026-09-23T03:03:32.580Z');
INSERT INTO token_usage_logs (user_id, request_id, provider, model, endpoint, prompt_tokens, completion_tokens, total_tokens, estimated_cost_usd, latency_ms, compression_applied, compression_ratio, success, created_at) VALUES (uid, 'demo-req-6', 'gemini', 'gemini-1.5-flash', '/chat', 260, 129, 389, 0.000584, 1418, true, 0.75, true, '2026-09-23T03:03:32.580Z');
INSERT INTO token_usage_logs (user_id, request_id, provider, model, endpoint, prompt_tokens, completion_tokens, total_tokens, estimated_cost_usd, latency_ms, compression_applied, compression_ratio, success, created_at) VALUES (uid, 'demo-req-7', 'gemini', 'gemini-1.5-pro', '/sources/analyze', 455, 138, 593, 0.000889, 1447, false, 0.75, true, '2026-10-02T03:03:32.580Z');
INSERT INTO token_usage_logs (user_id, request_id, provider, model, endpoint, prompt_tokens, completion_tokens, total_tokens, estimated_cost_usd, latency_ms, compression_applied, compression_ratio, success, created_at) VALUES (uid, 'demo-req-8', 'gemini', 'gemini-1.5-flash', '/tutor/agent', 419, 167, 586, 0.000879, 524, true, 0.75, true, '2026-10-02T03:03:32.580Z');
INSERT INTO token_usage_logs (user_id, request_id, provider, model, endpoint, prompt_tokens, completion_tokens, total_tokens, estimated_cost_usd, latency_ms, compression_applied, compression_ratio, success, created_at) VALUES (uid, 'demo-req-9', 'gemini', 'gemini-1.5-pro', '/tutor/orchestrator', 552, 517, 1069, 0.001603, 772, false, 0.75, true, '2026-09-30T03:03:32.580Z');
INSERT INTO token_usage_logs (user_id, request_id, provider, model, endpoint, prompt_tokens, completion_tokens, total_tokens, estimated_cost_usd, latency_ms, compression_applied, compression_ratio, success, created_at) VALUES (uid, 'demo-req-10', 'gemini', 'gemini-1.5-flash', '/chat', 717, 585, 1302, 0.001953, 1619, true, 0.75, true, '2026-10-02T03:03:32.580Z');
INSERT INTO token_usage_logs (user_id, request_id, provider, model, endpoint, prompt_tokens, completion_tokens, total_tokens, estimated_cost_usd, latency_ms, compression_applied, compression_ratio, success, created_at) VALUES (uid, 'demo-req-11', 'gemini', 'gemini-1.5-pro', '/sources/analyze', 664, 413, 1077, 0.001615, 848, false, 0.75, true, '2026-09-28T03:03:32.580Z');
INSERT INTO token_usage_logs (user_id, request_id, provider, model, endpoint, prompt_tokens, completion_tokens, total_tokens, estimated_cost_usd, latency_ms, compression_applied, compression_ratio, success, created_at) VALUES (uid, 'demo-req-12', 'gemini', 'gemini-1.5-flash', '/tutor/agent', 352, 640, 992, 0.001488, 842, true, 0.75, true, '2026-09-23T03:03:32.580Z');
INSERT INTO token_usage_logs (user_id, request_id, provider, model, endpoint, prompt_tokens, completion_tokens, total_tokens, estimated_cost_usd, latency_ms, compression_applied, compression_ratio, success, created_at) VALUES (uid, 'demo-req-13', 'gemini', 'gemini-1.5-pro', '/tutor/orchestrator', 369, 176, 545, 0.000818, 1414, false, 0.75, true, '2026-09-29T03:03:32.580Z');
INSERT INTO token_usage_logs (user_id, request_id, provider, model, endpoint, prompt_tokens, completion_tokens, total_tokens, estimated_cost_usd, latency_ms, compression_applied, compression_ratio, success, created_at) VALUES (uid, 'demo-req-14', 'gemini', 'gemini-1.5-flash', '/chat', 698, 579, 1277, 0.001915, 1931, true, 0.75, true, '2026-09-27T03:03:32.580Z');
INSERT INTO token_usage_logs (user_id, request_id, provider, model, endpoint, prompt_tokens, completion_tokens, total_tokens, estimated_cost_usd, latency_ms, compression_applied, compression_ratio, success, created_at) VALUES (uid, 'demo-req-15', 'gemini', 'gemini-1.5-pro', '/sources/analyze', 478, 410, 888, 0.001332, 2056, false, 0.75, true, '2026-09-24T03:03:32.580Z');
INSERT INTO token_usage_logs (user_id, request_id, provider, model, endpoint, prompt_tokens, completion_tokens, total_tokens, estimated_cost_usd, latency_ms, compression_applied, compression_ratio, success, created_at) VALUES (uid, 'demo-req-16', 'gemini', 'gemini-1.5-flash', '/tutor/agent', 875, 215, 1090, 0.001635, 657, true, 0.75, true, '2026-09-22T03:03:32.580Z');
INSERT INTO token_usage_logs (user_id, request_id, provider, model, endpoint, prompt_tokens, completion_tokens, total_tokens, estimated_cost_usd, latency_ms, compression_applied, compression_ratio, success, created_at) VALUES (uid, 'demo-req-17', 'gemini', 'gemini-1.5-pro', '/tutor/orchestrator', 510, 350, 860, 0.001290, 2076, false, 0.75, true, '2026-09-21T03:03:32.580Z');
INSERT INTO token_usage_logs (user_id, request_id, provider, model, endpoint, prompt_tokens, completion_tokens, total_tokens, estimated_cost_usd, latency_ms, compression_applied, compression_ratio, success, created_at) VALUES (uid, 'demo-req-18', 'gemini', 'gemini-1.5-flash', '/chat', 212, 462, 674, 0.001011, 614, true, 0.75, true, '2026-09-23T03:03:32.580Z');
INSERT INTO token_usage_logs (user_id, request_id, provider, model, endpoint, prompt_tokens, completion_tokens, total_tokens, estimated_cost_usd, latency_ms, compression_applied, compression_ratio, success, created_at) VALUES (uid, 'demo-req-19', 'gemini', 'gemini-1.5-pro', '/sources/analyze', 270, 339, 609, 0.000914, 652, false, 0.75, true, '2026-09-20T03:03:32.580Z');
INSERT INTO token_usage_logs (user_id, request_id, provider, model, endpoint, prompt_tokens, completion_tokens, total_tokens, estimated_cost_usd, latency_ms, compression_applied, compression_ratio, success, created_at) VALUES (uid, 'demo-req-20', 'gemini', 'gemini-1.5-flash', '/tutor/agent', 471, 292, 763, 0.001145, 1879, true, 0.75, true, '2026-09-19T03:03:32.580Z');
INSERT INTO token_usage_logs (user_id, request_id, provider, model, endpoint, prompt_tokens, completion_tokens, total_tokens, estimated_cost_usd, latency_ms, compression_applied, compression_ratio, success, created_at) VALUES (uid, 'demo-req-21', 'gemini', 'gemini-1.5-pro', '/tutor/orchestrator', 734, 625, 1359, 0.002038, 1188, false, 0.75, true, '2026-10-02T03:03:32.580Z');
INSERT INTO token_usage_logs (user_id, request_id, provider, model, endpoint, prompt_tokens, completion_tokens, total_tokens, estimated_cost_usd, latency_ms, compression_applied, compression_ratio, success, created_at) VALUES (uid, 'demo-req-22', 'gemini', 'gemini-1.5-flash', '/chat', 758, 225, 983, 0.001475, 709, true, 0.75, true, '2026-10-02T03:03:32.580Z');
INSERT INTO token_usage_logs (user_id, request_id, provider, model, endpoint, prompt_tokens, completion_tokens, total_tokens, estimated_cost_usd, latency_ms, compression_applied, compression_ratio, success, created_at) VALUES (uid, 'demo-req-23', 'gemini', 'gemini-1.5-pro', '/sources/analyze', 486, 530, 1016, 0.001524, 892, false, 0.75, true, '2026-10-01T03:03:32.580Z');
INSERT INTO token_usage_logs (user_id, request_id, provider, model, endpoint, prompt_tokens, completion_tokens, total_tokens, estimated_cost_usd, latency_ms, compression_applied, compression_ratio, success, created_at) VALUES (uid, 'demo-req-24', 'gemini', 'gemini-1.5-flash', '/tutor/agent', 922, 415, 1337, 0.002005, 1941, true, 0.75, true, '2026-09-27T03:03:32.580Z');
INSERT INTO token_usage_logs (user_id, request_id, provider, model, endpoint, prompt_tokens, completion_tokens, total_tokens, estimated_cost_usd, latency_ms, compression_applied, compression_ratio, success, created_at) VALUES (uid, 'demo-req-25', 'gemini', 'gemini-1.5-pro', '/tutor/orchestrator', 586, 231, 817, 0.001226, 1692, false, 0.75, true, '2026-09-28T03:03:32.580Z');
INSERT INTO token_usage_logs (user_id, request_id, provider, model, endpoint, prompt_tokens, completion_tokens, total_tokens, estimated_cost_usd, latency_ms, compression_applied, compression_ratio, success, created_at) VALUES (uid, 'demo-req-26', 'gemini', 'gemini-1.5-flash', '/chat', 358, 146, 504, 0.000756, 907, true, 0.75, true, '2026-09-19T03:03:32.580Z');
INSERT INTO token_usage_logs (user_id, request_id, provider, model, endpoint, prompt_tokens, completion_tokens, total_tokens, estimated_cost_usd, latency_ms, compression_applied, compression_ratio, success, created_at) VALUES (uid, 'demo-req-27', 'gemini', 'gemini-1.5-pro', '/sources/analyze', 340, 547, 887, 0.001331, 2269, false, 0.75, true, '2026-09-23T03:03:32.580Z');
INSERT INTO token_usage_logs (user_id, request_id, provider, model, endpoint, prompt_tokens, completion_tokens, total_tokens, estimated_cost_usd, latency_ms, compression_applied, compression_ratio, success, created_at) VALUES (uid, 'demo-req-28', 'gemini', 'gemini-1.5-flash', '/tutor/agent', 645, 311, 956, 0.001434, 1551, true, 0.75, true, '2026-09-26T03:03:32.580Z');
INSERT INTO token_usage_logs (user_id, request_id, provider, model, endpoint, prompt_tokens, completion_tokens, total_tokens, estimated_cost_usd, latency_ms, compression_applied, compression_ratio, success, created_at) VALUES (uid, 'demo-req-29', 'gemini', 'gemini-1.5-pro', '/tutor/orchestrator', 201, 203, 404, 0.000606, 2084, false, 0.75, true, '2026-10-02T03:03:32.580Z');

-- Mood check-ins (V13 — skip if table not present)
DELETE FROM mood_checkins WHERE user_id = uid;
INSERT INTO mood_checkins (user_id, mood, energy_level, focus_level, stress_level, source, created_at) VALUES (uid, 'neutral', 2, 4, 4, 'manual', '2026-09-18T03:03:32.580Z');
INSERT INTO mood_checkins (user_id, mood, energy_level, focus_level, stress_level, source, created_at) VALUES (uid, 'focused', 4, 2, 2, 'manual', '2026-09-19T03:03:32.580Z');
INSERT INTO mood_checkins (user_id, mood, energy_level, focus_level, stress_level, source, created_at) VALUES (uid, 'energized', 5, 2, 3, 'manual', '2026-09-20T03:03:32.580Z');
INSERT INTO mood_checkins (user_id, mood, energy_level, focus_level, stress_level, source, created_at) VALUES (uid, 'anxious', 3, 2, 2, 'manual', '2026-09-21T03:03:32.580Z');
INSERT INTO mood_checkins (user_id, mood, energy_level, focus_level, stress_level, source, created_at) VALUES (uid, 'stressed', 4, 4, 3, 'manual', '2026-09-22T03:03:32.580Z');
INSERT INTO mood_checkins (user_id, mood, energy_level, focus_level, stress_level, source, created_at) VALUES (uid, 'tired', 4, 2, 4, 'manual', '2026-09-23T03:03:32.580Z');
INSERT INTO mood_checkins (user_id, mood, energy_level, focus_level, stress_level, source, created_at) VALUES (uid, 'neutral', 2, 4, 2, 'manual', '2026-09-24T03:03:32.580Z');
INSERT INTO mood_checkins (user_id, mood, energy_level, focus_level, stress_level, source, created_at) VALUES (uid, 'focused', 3, 4, 3, 'manual', '2026-09-25T03:03:32.580Z');
INSERT INTO mood_checkins (user_id, mood, energy_level, focus_level, stress_level, source, created_at) VALUES (uid, 'energized', 2, 2, 2, 'manual', '2026-09-26T03:03:32.580Z');
INSERT INTO mood_checkins (user_id, mood, energy_level, focus_level, stress_level, source, created_at) VALUES (uid, 'anxious', 3, 3, 2, 'manual', '2026-09-27T03:03:32.580Z');
INSERT INTO mood_checkins (user_id, mood, energy_level, focus_level, stress_level, source, created_at) VALUES (uid, 'stressed', 4, 4, 2, 'manual', '2026-09-28T03:03:32.580Z');
INSERT INTO mood_checkins (user_id, mood, energy_level, focus_level, stress_level, source, created_at) VALUES (uid, 'tired', 3, 2, 1, 'manual', '2026-09-29T03:03:32.580Z');
INSERT INTO mood_checkins (user_id, mood, energy_level, focus_level, stress_level, source, created_at) VALUES (uid, 'neutral', 3, 4, 4, 'manual', '2026-09-30T03:03:32.580Z');
INSERT INTO mood_checkins (user_id, mood, energy_level, focus_level, stress_level, source, created_at) VALUES (uid, 'focused', 3, 4, 1, 'manual', '2026-10-01T03:03:32.580Z');
INSERT INTO mood_checkins (user_id, mood, energy_level, focus_level, stress_level, source, created_at) VALUES (uid, 'energized', 4, 5, 4, 'manual', '2026-10-02T03:03:32.580Z');
INSERT INTO mood_checkins (user_id, mood, energy_level, focus_level, stress_level, source, notes) VALUES (uid, 'focused', 4, 5, 2, 'manual', 'Feeling great for the hackathon demo!');

END $$;