CREATE TABLE test_table (
  match_id int,
  user_id int,
  prono_type text,
  prono_value text,
  UNIQUE (match_id, user_id, prono_type, prono_value)
);

CREATE UNIQUE INDEX idx_test ON test_table(match_id, user_id) WHERE prono_type = 'exact_score';

INSERT INTO test_table VALUES (1, 1, 'exact_score', '1-0')
ON CONFLICT (match_id, user_id) WHERE prono_type = 'exact_score'
DO UPDATE SET prono_value = EXCLUDED.prono_value;
