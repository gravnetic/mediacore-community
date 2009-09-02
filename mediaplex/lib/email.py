import smtplib
from tg import config, request
from mediaplex.lib.helpers import url_for, clean_xhtml, strip_xhtml, line_break_xhtml

def send(to_addr, from_addr, subject, body):
    """Send an email!

    Expects subject and body to be unicode strings.
    """
    server = smtplib.SMTP('localhost')

    msg = """To: %s
From: %s
Subject: %s

%s
""" % (", ".join(to_addr), from_addr, subject, body)

    server.sendmail(from_addr, to_addr, msg.encode('utf-8'))
    server.quit()

def send_media_notification(media_obj):
    if not config.media_notifications:
        # media notification emails are disabled!
        return

    edit_url = 'http://' + request.environ['HTTP_HOST']\
        + url_for(controller='mediaadmin', action='edit', id=media_obj.id),

    clean_description = strip_xhtml(
            line_break_xhtml(line_break_xhtml(media_obj.description)))

    subject = 'New %s: %s' % (media_obj.type, media_obj.title)
    body = """A new %s file has been uploaded!

Title: %s

Author: %s (%s)

Admin URL: %s

Description: %s
""" % (media_obj.type, media_obj.title, media_obj.author.name,
       media_obj.author.email, edit_url, clean_description)

    send(config.media_notification_addresses,
            config.notification_from_address, subject, body)

def send_comment_notification(media, comment):
    if not config.comment_notifications:
        # Comment notification emails are disabled!
        return

    subject = 'New Comment: %s' % comment.subject
    body = """A new comment has been posted!

Author: %s
Post: %s

Body: %s
""" % (comment.author.name,
    'http://' + request.environ['HTTP_HOST'] + url_for(controller='media', action='view', slug=media.slug),
    strip_xhtml(line_break_xhtml(line_break_xhtml(comment.body))))

    send(config.comment_notification_addresses,
            config.notification_from_address, subject, body)
