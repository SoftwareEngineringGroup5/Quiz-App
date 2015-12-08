# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import migrations, models
import datetime


class Migration(migrations.Migration):

    dependencies = [
        ('quizapp', '0008_auto_20151110_1602'),
    ]

    operations = [
        migrations.AlterField(
            model_name='question',
            name='answer',
            field=models.ForeignKey(default=1, to='quizapp.answer'),
        ),
        migrations.AlterField(
            model_name='question',
            name='pub_date',
            field=models.DateTimeField(default=datetime.datetime(2015, 12, 8, 12, 55, 58, 973000), verbose_name=b'date published'),
        ),
    ]
