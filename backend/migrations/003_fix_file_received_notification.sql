-- Re-runnable repair for existing databases. The shares trigger calls this
-- procedure inside the share INSERT transaction.
CREATE OR REPLACE PROCEDURE public.notify_file_received(IN p_file_id integer, IN p_recipient_id integer)
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_filename VARCHAR(255);
BEGIN
    SELECT f.original_name
    INTO v_filename
    FROM public.shares AS s
    JOIN public.files AS f ON f.id = s.file_id
    WHERE s.file_id = p_file_id
      AND s.shared_with = p_recipient_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Valid file share not found';
    END IF;

    INSERT INTO public.notifications (recipient_id, file_id, type, details)
    VALUES (
        p_recipient_id,
        p_file_id,
        'file_received',
        jsonb_build_object(
            'filename', v_filename,
            'message', 'A file was shared with you'
        )
    );
END;
$$;
